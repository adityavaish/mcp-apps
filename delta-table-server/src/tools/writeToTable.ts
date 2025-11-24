import { z } from "zod";
import { DeltaTableService } from "../services/deltaTableService.js";

export const writeToTableTool = {
  name: "write_to_table",
  description: "Write records to a delta table at the specified path",
  parameters: {
    tablePath: z.string().describe("The path to the delta table (e.g., 'test-tables/my-table')"),
    records: z.array(z.record(z.any())).describe("Array of records to write to the table")
  },
  handler: async (args: { tablePath: string; records: Array<Record<string, any>> }) => {
    try {
      // Validate inputs
      if (!args.tablePath || args.tablePath.trim() === "") {
        throw new Error("tablePath is required and cannot be empty");
      }

      if (!Array.isArray(args.records)) {
        throw new Error("records must be an array");
      }

      if (args.records.length === 0) {
        throw new Error("records array cannot be empty");
      }

      const service = new DeltaTableService();
      const result = await service.writeToTable(args.tablePath, args.records);

      return {
        content: [
          {
            type: "text" as const,
            text: `${result}\nWrote ${args.records.length} records to table at ${args.tablePath}`
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error in writeToTable handler:", errorMessage);

      // Check for common error patterns
      const isAuthError = errorMessage.includes('not authorized') || 
                         errorMessage.includes('authentication') ||
                         errorMessage.includes('permission');
      const isSchemaError = errorMessage.includes('Schema mismatch') ||
                           errorMessage.includes('inconsistent schema');

      let troubleshootingTips = '\n\nTroubleshooting tips:\n';

      if (isAuthError) {
        troubleshootingTips += `⚠️  **Azure Authentication Issue Detected**\n` +
                              `- Run 'az login' to authenticate with Azure\n` +
                              `- Verify you have write permissions to storage account \n` +
                              `- Check your Azure role assignments (need Storage Blob Data Contributor or similar)\n` +
                              `- Ensure DefaultAzureCredential can find valid credentials\n\n`;
      } else if (isSchemaError) {
        troubleshootingTips += `⚠️  **Schema Validation Issue Detected**\n` +
                              `- All records must have exactly the same field names\n` +
                              `- Check for typos or missing fields across records\n\n`;
      }

      troubleshootingTips += `General tips:\n` +
                           `- Ensure all records have consistent schema\n` +
                           `- Date/timestamp strings must be in ISO format (e.g., '2025-10-26T12:00:00Z')\n` +
                           `- Verify Azure credentials are configured correctly\n` +
                           `- Make sure the table path is valid (e.g., 'data/tables/my-table')`;

      return {
        content: [
          {
            type: "text" as const,
            text: `Error writing to delta table: ${errorMessage}${troubleshootingTips}`
          }
        ],
        isError: true
      };
    }
  }
};