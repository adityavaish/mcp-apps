import { z } from "zod";
import { KustoService } from "../services/kustoService";

// Tool to execute KQL queries
export const executeQueryTool = {
  name: "execute_query",
  description: `This tool executes a Kusto query against the database and returns the results.
  The query must be a valid KQL query without administrative commands.
  The result is a JSON object containing the query results.
  Inputs: clusterUrl, database, query, maxRows (optional, default is 100).
  Note: When querying external tables make sure to use apppropriate syntax (e.g. 'external_table(<table_name>)').
  Note: The query *must* not contain any administrative commands or control commands.
  Note: For listing tables, use the 'list_tables' tool.
  Note: For getting table schema, use the 'get_table_schema' tool.`,
  parameters: {
    clusterUrl: z.string().describe("The Kusto cluster URL (e.g., https://yourcluster.kusto.windows.net)"),
    database: z.string().describe("The name of the database in the Kusto cluster"),
    query: z.string().min(1).max(10000).describe("The KQL query to execute"),
    maxRows: z.number().int().min(1).max(10000).optional().default(100).describe("Maximum number of rows to return (default: 100)")
  },
  handler: async ({ clusterUrl, database, query, maxRows = 100 }: {
    clusterUrl: string;
    database: string;
    query: string;
    maxRows?: number;
  }) => {
    // Check for forbidden administrative commands
    const controlCommandPatterns = [
      /alter\s+table/i,
      /create\s+table/i,
      /drop\s+table/i,
      /set\s+/i,
      /function/i,
      /policy/i,
      /purge/i,
      /ingestion/i,
      /database/i,
      /cluster/i,
      /management/i,
      /\|\s*render/i,
      /let\s+\w+\s*=/i
    ];

    for (const pattern of controlCommandPatterns) {
      if (pattern.test(query)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: The query contains forbidden administrative commands or syntax.
                Please use only Kusto query language (KQL) operations.
                Note: For listing tables, use the \`list_tables\` tool.
                Note: For getting table schema, use the \`get_table_schema\` tool.`
            }
          ]
        };
      }
    }

    try {
      const safeQuery = `${query} | take ${maxRows}`;
      const result = await KustoService.executeQuery(clusterUrl, database, safeQuery);

      return {
        content: [
          {
            type: "text" as const,
            text: `Query results: ${JSON.stringify(result, null, 2)}`
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error executing query: ${error.message}`
          }
        ]
      };
    }
  }
};
