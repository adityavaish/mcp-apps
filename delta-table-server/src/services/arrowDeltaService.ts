import { DataLakeServiceClient } from "@azure/storage-file-datalake";
import * as arrow from "apache-arrow";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
// @ts-ignore - parquet-wasm doesn't have complete types
import { writeParquet as writeParquetWasm, Table as WasmTable, WriterPropertiesBuilder } from "parquet-wasm/node";
import { getAccessToken } from "./token-manager.js";

export interface TestRecord {
  [key: string]: any;
}

export class ArrowDeltaService {
  private containerName: string;
  private accountName: string;
  private clientId?: string;
  private tenantId?: string;

  constructor() {
    this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || "";
    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "";
    this.clientId = process.env.AZURE_CLIENT_ID;
    this.tenantId = process.env.AZURE_TENANT_ID;

    if (!this.accountName) {
      throw new Error("AZURE_STORAGE_ACCOUNT_NAME environment variable is required");
    }
    if (!this.containerName) {
      throw new Error("AZURE_STORAGE_CONTAINER_NAME environment variable is required");
    }
  }

  private async getDataLakeServiceClient(): Promise<DataLakeServiceClient> {
    const token = await getAccessToken(
      this.clientId,
      this.tenantId,
      ["https://storage.azure.com/.default"],
      true
    );
    const credential = {
      getToken: async () => ({ token, expiresOnTimestamp: Date.now() + 3600000 })
    };
    return new DataLakeServiceClient(`https://${this.accountName}.dfs.core.windows.net`, credential as any);
  }

  /**
   * Infer Arrow DataType from JavaScript value
   */
  private inferArrowType(value: any): arrow.DataType {
    if (value === null || value === undefined) {
      return new arrow.Utf8();
    } else if (typeof value === "string") {
      // Check if it's a timestamp
      if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        return new arrow.TimestampMillisecond();
      }
      return new arrow.Utf8();
    } else if (typeof value === "number") {
      if (Number.isInteger(value)) {
        return new arrow.Int32();
      } else {
        return new arrow.Float64();
      }
    } else if (typeof value === "boolean") {
      return new arrow.Bool();
    } else if (value instanceof Date) {
      return new arrow.TimestampMillisecond();
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        // Empty array - default to string array
        return new arrow.List(new arrow.Field("item", new arrow.Utf8(), true));
      }
      const elementType = this.inferArrowType(value[0]);
      return new arrow.List(new arrow.Field("item", elementType, true));
    } else if (typeof value === "object" && value !== null) {
      // Nested struct
      const fields: arrow.Field[] = [];
      for (const [key, val] of Object.entries(value)) {
        const fieldType = this.inferArrowType(val);
        fields.push(new arrow.Field(key, fieldType, true));
      }
      return new arrow.Struct(fields);
    }
    return new arrow.Utf8();
  }

  /**
   * Build Arrow schema from sample record
   */
  private buildArrowSchema(sampleRecord: TestRecord): arrow.Schema {
    const fields: arrow.Field[] = [];

    for (const [key, value] of Object.entries(sampleRecord)) {
      const dataType = this.inferArrowType(value);
      fields.push(new arrow.Field(key, dataType, true));
    }

    return new arrow.Schema(fields);
  }

  /**
   * Build Arrow vectors for each field
   */
  private buildArrowVectors(schema: arrow.Schema, records: TestRecord[]): Map<string, arrow.Vector> {
    const vectors = new Map<string, arrow.Vector>();

    for (const field of schema.fields) {
      const values: any[] = [];

      for (const record of records) {
        const value = record[field.name];
        const converted = this.convertValue(value, field.type);
        values.push(converted);
      }

      // Create vector with explicit type
      const builder = arrow.makeBuilder({
        type: field.type,
        nullValues: [null, undefined]
      });

      for (const value of values) {
        builder.append(value);
      }

      vectors.set(field.name, builder.finish().toVector());
    }

    return vectors;
  }

  /**
   * Convert JavaScript value to Arrow-compatible format
   */
  private convertValue(value: any, dataType: arrow.DataType): any {
    if (value === null || value === undefined) {
      return null;
    }

    if (dataType instanceof arrow.TimestampMillisecond) {
      if (typeof value === "string") {
        return new Date(value).getTime();
      } else if (value instanceof Date) {
        return value.getTime();
      }
      return value;
    } else if (dataType instanceof arrow.List) {
      if (!Array.isArray(value)) {
        return null;
      }
      const elementType = (dataType.children[0] as arrow.Field).type;
      return value.map(v => this.convertValue(v, elementType));
    } else if (dataType instanceof arrow.Struct) {
      if (typeof value !== "object" || value === null) {
        return null;
      }
      const converted: any = {};
      for (const field of dataType.children as arrow.Field[]) {
        converted[field.name] = this.convertValue(value[field.name], field.type);
      }
      return converted;
    }

    return value;
  }

  async writeToTable(tablePath: string, records: TestRecord[]): Promise<string> {
    try {
      if (records.length === 0) {
        throw new Error("Cannot write empty records array");
      }

      const client = await this.getDataLakeServiceClient();
      const fileSystemClient = client.getFileSystemClient(this.containerName);
      const timestamp = Date.now();
      const fileName = `part-${timestamp}-${uuidv4()}.parquet`;
      const filePath = `${tablePath}/${fileName}`;

      // Prepare records for Arrow conversion
      // Keep empty arrays as empty arrays - Arrow/Parquet-wasm handles them correctly
      const preparedRecords = records.map(record => {
        const copy = JSON.parse(JSON.stringify(record));

        // Convert date strings to proper Date objects for timestamp fields
        const convertDates = (obj: any): any => {
          if (obj === null || obj === undefined) {
            return obj;
          }
          if (Array.isArray(obj)) {
            return obj.map(item => convertDates(item));
          } else if (typeof obj === 'object') {
            const result: any = {};
            for (const [key, value] of Object.entries(obj)) {
              // Convert ISO date strings to Date objects
              if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                result[key] = new Date(value);
              } else {
                result[key] = convertDates(value);
              }
            }
            return result;
          }
          return obj;
        };

        return convertDates(copy);
      });

      // Convert to Arrow table with proper nested schema
      // tableFromJSON handles nested structures automatically
      let table: arrow.Table;
      try {
        table = arrow.tableFromJSON(preparedRecords);
      } catch (arrowError: any) {
        throw new Error(`Failed to create Arrow table from records: ${arrowError.message}. This usually means the data has inconsistent schema across records.`);
      }

      // Write to Parquet using parquet-wasm (supports complex nested types!)
      const tempFile = path.join(process.cwd(), `temp_arrow_${timestamp}.parquet`);

      try {
        // Convert Arrow table to IPC format (byte stream)
        const writer = arrow.RecordBatchStreamWriter.writeAll(table);
        const arrowIpcBytes = await writer.toUint8Array();

        // Create a WASM Table from Arrow IPC bytes
        let wasmTable: any;
        try {
          wasmTable = WasmTable.fromIPCStream(arrowIpcBytes);
        } catch (wasmError: any) {
          throw new Error(`Failed to convert Arrow table to WASM: ${wasmError.message}`);
        }

        // Configure writer properties for Spark compatibility
        const writerProps = new WriterPropertiesBuilder()
          .setCompression("snappy")
          .build();

        // Use parquet-wasm to write to Parquet format with properties
        // This properly handles complex nested types!
        let parquetBytes: Uint8Array;
        try {
          parquetBytes = writeParquetWasm(wasmTable, writerProps);
        } catch (parquetError: any) {
          throw new Error(`Failed to write Parquet format: ${parquetError.message}`);
        }

        // Write to temporary file
        fs.writeFileSync(tempFile, Buffer.from(parquetBytes));

        // Read the file back
        const parquetBuffer = fs.readFileSync(tempFile);

        // Upload to Azure
        const fileClient = fileSystemClient.getFileClient(filePath);
        try {
          await fileClient.create();
          await fileClient.append(parquetBuffer, 0, parquetBuffer.length);
          await fileClient.flush(parquetBuffer.length);
        } catch (uploadError: any) {
          throw new Error(`Failed to upload to Azure: ${uploadError.message}`);
        }

        // Clean up
        fs.unlinkSync(tempFile);

        // Update delta log
        const deltaLogPath = `${tablePath}/_delta_log`;
        const nextVersion = await this.getNextVersion(fileSystemClient, deltaLogPath);
        const logFileName = nextVersion.toString().padStart(20, '0') + '.json';

        const addAction = {
          add: {
            path: fileName,
            partitionValues: {},
            size: parquetBuffer.length,
            modificationTime: timestamp,
            dataChange: true,
            stats: JSON.stringify({
              numRecords: records.length
            })
          }
        };

        const logFileClient = fileSystemClient.getFileClient(`${deltaLogPath}/${logFileName}`);
        const logContent = JSON.stringify(addAction) + '\n';

        await logFileClient.create();
        await logFileClient.append(Buffer.from(logContent), 0, logContent.length);
        await logFileClient.flush(logContent.length);

        return `Successfully wrote ${records.length} records to delta table at ${tablePath}`;
      } catch (arrowError) {
        // Clean up temp file
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        throw arrowError;
      }
    } catch (error) {
      throw new Error(`Failed to write data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getNextVersion(fileSystemClient: any, deltaLogPath: string): Promise<number> {
    const latestVersion = await this.getLatestVersion(fileSystemClient, deltaLogPath);
    return latestVersion + 1;
  }

  private async getLatestVersion(fileSystemClient: any, deltaLogPath: string): Promise<number> {
    let maxVersion = -1;
    try {
      const iterator = fileSystemClient.listPaths({
        path: deltaLogPath,
        recursive: false
      });

      for await (const pathItem of iterator) {
        if (pathItem.isDirectory === false && pathItem.name) {
          const fileName = path.basename(pathItem.name);
          if (fileName.endsWith('.json')) {
            const versionStr = fileName.replace('.json', '');
            const version = parseInt(versionStr, 10);
            if (!isNaN(version) && version > maxVersion) {
              maxVersion = version;
            }
          }
        }
      }
    } catch (error) {
      return -1;
    }
    return maxVersion;
  }

  /**
   * Convert Arrow DataType to Parquet schema definition for parquetjs
   */
  private arrowTypeToParquetSchema(dataType: arrow.DataType): any {
    if (dataType instanceof arrow.Utf8) {
      return { type: 'UTF8' };
    } else if (dataType instanceof arrow.Int32 || dataType instanceof arrow.Int64) {
      return { type: 'INT32' };
    } else if (dataType instanceof arrow.Float64) {
      return { type: 'DOUBLE' };
    } else if (dataType instanceof arrow.Bool) {
      return { type: 'BOOLEAN' };
    } else if (dataType instanceof arrow.TimestampMillisecond) {
      return { type: 'TIMESTAMP_MILLIS' };
    } else if (dataType instanceof arrow.List || dataType instanceof arrow.Struct) {
      // Complex types will be serialized as JSON strings
      return { type: 'UTF8' };
    } else {
      return { type: 'UTF8' };
    }
  }
}