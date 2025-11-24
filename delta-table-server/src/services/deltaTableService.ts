import { DataLakeServiceClient } from "@azure/storage-file-datalake";
import * as parquet from "@dsnp/parquetjs";
import * as fs from "fs";
import * as path from "path";
import { ArrowDeltaService } from "./arrowDeltaService.js";
import { getAccessToken } from "./token-manager.js";

export interface TestRecord {
  [key: string]: any;
}

export class DeltaTableService {
  private containerName: string;
  private accountName: string;
  private arrowService: ArrowDeltaService;
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

    this.arrowService = new ArrowDeltaService();
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
   * Check if record contains complex types (arrays or nested objects)
   */
  private hasComplexTypes(record: TestRecord): boolean {
    for (const value of Object.values(record)) {
      if (Array.isArray(value)) {
        return true;
      }
      if (typeof value === "object" && value !== null && !(value instanceof Date)) {
        return true;
      }
    }
    return false;
  }

  async writeToTable(tablePath: string, records: TestRecord[]): Promise<string> {
    // Validate records have consistent schema
    if (records.length === 0) {
      throw new Error("Cannot write empty records array");
    }

    // Check that all records have the same keys
    const firstRecordKeys = Object.keys(records[0]).sort();
    for (let i = 1; i < records.length; i++) {
      const currentKeys = Object.keys(records[i]).sort();
      if (JSON.stringify(firstRecordKeys) !== JSON.stringify(currentKeys)) {
        throw new Error(
          `Schema mismatch detected. Record at index ${i} has different fields than the first record.\n` +
          `Expected fields: ${firstRecordKeys.join(', ')}\n` +
          `Got fields: ${currentKeys.join(', ')}`
        );
      }
    }

    // Use Apache Arrow service for all writes to ensure consistent nested schema handling
    console.log("Using Apache Arrow for write operation");
    try {
      return await this.arrowService.writeToTable(tablePath, records);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Write failed:", errorMessage);
      throw new Error(`Failed to write to table: ${errorMessage}`);
    }
  }

  async readFromTable(tablePath: string): Promise<TestRecord[]> {
    // Use Parquet-based reader (works for both simple and complex types when reading)
    return await this.readFromTableParquet(tablePath);
  }

  private async readFromTableParquet(tablePath: string): Promise<TestRecord[]> {
    try {
      const client = await this.getDataLakeServiceClient();
      const fileSystemClient = client.getFileSystemClient(this.containerName);
      const deltaLogPath = `${tablePath}/_delta_log`;

      // Read the latest transaction log to get list of files
      const latestVersion = await this.getLatestVersion(fileSystemClient, deltaLogPath);
      if (latestVersion === -1) {
        return []; // No data in table
      }

      const files: string[] = [];

      // Read all log files to get current files
      for (let version = 0; version <= latestVersion; version++) {
        const logFileName = version.toString().padStart(20, '0') + '.json';
        try {
          const logFileClient = fileSystemClient.getFileClient(`${deltaLogPath}/${logFileName}`);
          const downloadResponse = await logFileClient.read();
          const logContent = (await this.streamToString(downloadResponse.readableStreamBody!)).trim();

          const logEntry = JSON.parse(logContent);
          if (logEntry.add) {
            files.push(logEntry.add.path);
          }
        } catch (logError) {
          // Skip missing log files
          continue;
        }
      }

      // Read data from all Parquet files
      const allRecords: TestRecord[] = [];

      for (const fileName of files) {
        try {
          const fileClient = fileSystemClient.getFileClient(`${tablePath}/${fileName}`);
          const downloadResponse = await fileClient.read();
          const buffer = await this.streamToBuffer(downloadResponse.readableStreamBody!);

          // Write to temp file and read with Parquet
          const tempFile = path.join(process.cwd(), `temp_read_${Date.now()}.parquet`);
          fs.writeFileSync(tempFile, buffer);

          try {
            const reader = await parquet.ParquetReader.openFile(tempFile);
            const cursor = reader.getCursor();

            let record: any = null;
            while ((record = await cursor.next())) {
              // Convert record values back from Parquet format
              const convertedRecord: TestRecord = {};
              Object.keys(record).forEach(key => {
                let value = record[key];
                // Convert Date objects back to ISO strings for consistency
                if (value instanceof Date) {
                  value = value.toISOString();
                }
                // Try to parse JSON strings back to objects
                if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                  try {
                    value = JSON.parse(value);
                  } catch {
                    // Keep as string if not valid JSON
                  }
                }
                convertedRecord[key] = value;
              });
              allRecords.push(convertedRecord);
            }

            await reader.close();
          } finally {
            fs.unlinkSync(tempFile);
          }
        } catch (fileError) {
          console.warn(`Failed to read file ${fileName}:`, fileError);
          continue;
        }
      }

      return allRecords;
    } catch (error) {
      throw new Error(`Failed to read table data: ${error instanceof Error ? error.message : String(error)}`);
    }
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
      // Delta log directory doesn't exist yet
      return -1;
    }
    return maxVersion;
  }

  private async getNextVersion(fileSystemClient: any, deltaLogPath: string): Promise<number> {
    const latestVersion = await this.getLatestVersion(fileSystemClient, deltaLogPath);
    return latestVersion + 1;
  }

  private async streamToString(readableStream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      readableStream.on("data", (data) => {
        chunks.push(data instanceof Buffer ? data : Buffer.from(data));
      });
      readableStream.on("end", () => {
        resolve(Buffer.concat(chunks).toString());
      });
      readableStream.on("error", reject);
    });
  }

  private async streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      readableStream.on("data", (data) => {
        chunks.push(data instanceof Buffer ? data : Buffer.from(data));
      });
      readableStream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      readableStream.on("error", reject);
    });
  }
}