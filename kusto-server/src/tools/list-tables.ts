import { z } from "zod";
import { KustoService } from "../services/kustoService";

// Tool to list tables in the database
export const listTablesTool = {
  name: "list_tables",
  description: `This tool lists all tables in the Kusto database.
  The result is a list of table names in a string format separated by commas.
  Inputs: clusterUrl, database.`,
  parameters: {
    clusterUrl: z.string().describe("The Kusto cluster URL (e.g., https://yourcluster.kusto.windows.net)"),
    database: z.string().describe("The name of the database in the Kusto cluster")
  },
  handler: async ({ clusterUrl, database }: {
    clusterUrl: string;
    database: string;
  }) => {
    try {
      const tables = await KustoService.getTables(clusterUrl, database);
      
      return {
        content: [{ 
          type: "text" as const, 
          text: `Result: ${JSON.stringify(tables, null, 2)}` 
        }]
      };
    } catch (error) {
      console.error("Error listing tables:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        content: [{ 
          type: "text" as const, 
          text: `Error listing tables: ${errorMessage}` 
        }]
      };
    }
  }
};
