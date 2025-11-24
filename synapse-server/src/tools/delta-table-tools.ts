import { z } from "zod";
import { SynapseService } from "../services/synapseService";

// Common connection parameters schema
const connectionParametersSchema = {
  storageAccountName: z.string().optional().describe("Azure Storage account name (defaults to STORAGE_ACCOUNT_NAME env var)"),
  fileSystemName: z.string().optional().describe("File system/container name (defaults to FILE_SYSTEM_NAME env var)"),
  workspaceUrl: z.string().optional().describe("Synapse workspace URL (defaults to SYNAPSE_WORKSPACE_URL env var)")
};

// Schema for Delta table columns
const DeltaColumnSchema = z.object({
  name: z.string().describe("Column name"),
  type: z.enum([
    "string", "long", "int", "double", "float", "boolean", 
    "timestamp", "date", "binary", "decimal", "byte", "short"
  ]).describe("Column data type"),
  nullable: z.boolean().default(true).describe("Whether the column can be null")
});

export const createDeltaTableTool = {
  name: "create_delta_table",
  description: "Creates a new Delta table with the specified schema. Creates the proper Delta Lake transaction log with correct JSON Lines formatting.",
  parameters: {
    tablePath: z.string().describe("The path where the Delta table should be created (e.g., 'data/mypath/DeltaTables/my-table.delta')"),
    columns: z.array(DeltaColumnSchema).describe("Array of column definitions for the table schema"),
    partitionColumns: z.array(z.string()).optional().default([]).describe("Optional list of column names to partition by"),
    description: z.string().optional().describe("Optional description for the table"),
    ...connectionParametersSchema
  },
  handler: async ({ tablePath, columns, partitionColumns = [], description, storageAccountName, fileSystemName, workspaceUrl }: {
    tablePath: string;
    columns: Array<{ name: string; type: string; nullable?: boolean }>;
    partitionColumns?: string[];
    description?: string;
    storageAccountName?: string;
    fileSystemName?: string;
    workspaceUrl?: string;
  }) => {
    try {
      const synapseService = new SynapseService({
        storageAccountName,
        fileSystemName,
        synapseWorkspaceUrl: workspaceUrl
      });

      // Build the Delta Lake schema
      const fields = columns.map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable !== false,
        metadata: {}
      }));

      const schemaString = JSON.stringify({
        type: "struct",
        fields: fields
      });

      // Generate a unique table ID
      const tableId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const currentTimestamp = Date.now();

      // Create the transaction log entries (JSON Lines format - one JSON object per line)
      const commitInfo = {
        commitInfo: {
          timestamp: currentTimestamp,
          operation: "CREATE TABLE",
          operationParameters: {
            isManaged: "false",
            description: description || null,
            partitionBy: JSON.stringify(partitionColumns),
            properties: "{}"
          },
          isolationLevel: "Serializable",
          isBlindAppend: true
        }
      };

      const protocol = {
        protocol: {
          minReaderVersion: 1,
          minWriterVersion: 2
        }
      };

      const metaData = {
        metaData: {
          id: tableId,
          format: {
            provider: "parquet",
            options: {}
          },
          schemaString: schemaString,
          partitionColumns: partitionColumns,
          configuration: {},
          createdTime: currentTimestamp
        }
      };

      // Create JSON Lines format (one JSON object per line, no pretty printing)
      const transactionLog = 
        JSON.stringify(commitInfo) + "\n" +
        JSON.stringify(protocol) + "\n" +
        JSON.stringify(metaData);

      // Create the _delta_log directory and initial transaction log
      const logPath = `${tablePath}/_delta_log/00000000000000000000.json`;

      await synapseService.uploadToADLS(logPath, transactionLog);

      // Build success message
      let resultMessage = `Successfully created Delta table: ${tablePath}\n\n`;
      resultMessage += `Schema (${columns.length} columns):\n`;
      columns.forEach(col => {
        resultMessage += `  - ${col.name}: ${col.type}${col.nullable !== false ? ' (nullable)' : ' (not null)'}\n`;
      });

      if (partitionColumns.length > 0) {
        resultMessage += `\nPartitioned by: ${partitionColumns.join(', ')}\n`;
      }

      if (description) {
        resultMessage += `\nDescription: ${description}\n`;
      }

      resultMessage += `\nTransaction log created at: ${logPath}`;

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            message: resultMessage,
            tablePath,
            logPath,
            columnCount: columns.length
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: error.message,
            details: error.stack,
            troubleshooting: [
              "Ensure you have write permissions to the storage account",
              "Verify the table path doesn't already exist",
              "Check that Azure authentication is configured (az login)"
            ]
          }, null, 2)
        }],
        isError: true
      };
    }
  }
};