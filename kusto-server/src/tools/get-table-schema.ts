import { z } from "zod";
import { KustoService } from "../services/kustoService";

// Tool to get schema for a specific table
export const getTableSchemaTool = {
  name: "get_table_schema",
  description: `This tool retrieves the schema for a specific table in the Kusto database.
  The result is a detailed schema information.
  Inputs: clusterUrl, database, tableName.`,
  parameters: {
    clusterUrl: z.string().describe("The Kusto cluster URL (e.g., https://yourcluster.kusto.windows.net)"),
    database: z.string().describe("The name of the database in the Kusto cluster"),
    tableName: z.string().describe("The name of the table to get schema for"),
    isExternal: z.boolean().optional().describe("Whether the table is an external table")
  },
  handler: async ({ clusterUrl, database, tableName, isExternal }: {
    clusterUrl: string;
    database: string;
    tableName: string;
    isExternal?: boolean;
  }) => {
    try {
      const schema = await KustoService.getTableSchema(clusterUrl, database, tableName, isExternal);
      const columns = schema.OrderedColumns.map((column: { Name: any; CslType: any; }) => {
        return {
          name: column.Name,
          type: column.CslType
        };
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Schema for ${tableName}: ${JSON.stringify(columns, null, 2)}`
          }
        ]
      };
    } catch (error) {
      console.error(`Error getting schema for table ${tableName}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        content: [{ 
          type: "text" as const, 
          text: `Error getting table schema: ${errorMessage}` 
        }]
      };
    }
  }
};
