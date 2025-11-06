import { z } from "zod";
import { DeltaTableService } from "../services/deltaTableService.js";

export const readFromTableTool = {
  name: "read_from_table",
  description: "Read all records from a delta table at the specified path",
  parameters: {
    tablePath: z.string().describe("The path to the delta table (e.g., 'test-tables/my-table')")
  },
  handler: async (args: { tablePath: string }) => {
    try {
      const service = new DeltaTableService();
      const records = await service.readFromTable(args.tablePath);

      return {
        content: [
          {
            type: "text" as const,
            text: `Read ${records.length} records from table at ${args.tablePath}\n\nRecords:\n${JSON.stringify(records, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error reading from delta table: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
};