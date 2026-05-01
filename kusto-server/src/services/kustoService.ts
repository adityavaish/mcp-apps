import { KustoConnectionStringBuilder, Client as KustoClient } from "azure-kusto-data";
import {
  AzureCliCredential,
  AzureDeveloperCliCredential,
  ChainedTokenCredential,
  DeviceCodeCredential,
  TokenCredential,
  VisualStudioCodeCredential,
} from "@azure/identity";

const log = (...args: unknown[]) => console.error("[kusto-mcp]", ...args);

// Kusto scope for authentication
const KUSTO_SCOPE = "https://kusto.kusto.windows.net/.default";

export interface TableSchema {
  TableName: string;
  ColumnName: string;
  ColumnType: string;
  IsNullable: boolean;
  Description?: string;
}

export interface TableInfo {
  name: string;
  orderedColumns: {
    name: string;
    type: string;
    cslType: string;
  }[];
}

export class KustoService {
  private static credential: TokenCredential | null = null;

  private static getCredential(): TokenCredential {
    if (!KustoService.credential) {
      // Prefer non-interactive sources first so background/headless MCP runs
      // don't pop the WAM account picker when the user is already signed in.
      const tenantId = process.env.AZURE_TENANT_ID || process.env.TENANT_ID;
      const tenantOpts = tenantId
        ? { tenantId, additionallyAllowedTenants: ["*"] }
        : { additionallyAllowedTenants: ["*"] };

      const credentials: TokenCredential[] = [
        new AzureCliCredential(tenantOpts),
        new AzureDeveloperCliCredential(tenantOpts),
        new VisualStudioCodeCredential(tenantOpts),
        new DeviceCodeCredential({
          ...tenantOpts,
          userPromptCallback: (info) => {
            log(`To sign in, open ${info.verificationUri} and enter code ${info.userCode}`);
          },
        }),
      ];

      KustoService.credential = new ChainedTokenCredential(...credentials);
    }
    return KustoService.credential;
  }

  private static async createConnectionString(clusterUrl: string): Promise<any> {
    const credential = KustoService.getCredential();
    
    // Get a token to trigger authentication
    log("Requesting authentication token...");
    try {
      await credential.getToken(KUSTO_SCOPE);
      log("Authentication successful");
    } catch (error: any) {
      log("Authentication failed:", error.message);
      throw error;
    }
    
    return KustoConnectionStringBuilder.withTokenCredential(clusterUrl, credential);
  }

  /**
   * Get a client for a specific cluster URL and database
   */
  private static async getClient(clusterUrl: string, database: string): Promise<KustoClient> {
    if (!clusterUrl) {
      throw new Error("Cluster URL is required");
    }

    if (!database) {
      throw new Error("Database name is required");
    }

    try {
      log(`Creating Kusto client for ${clusterUrl}`);
      const connectionString = await KustoService.createConnectionString(clusterUrl);
      return new KustoClient(connectionString);
    } catch (error: any) {
      console.error("Failed to get Kusto client:", error.message);
      throw new Error(`Failed to connect to Kusto: ${error.message}`);
    }
  }

  /**
   * Execute a KQL query against the Kusto database
   */
  public static async executeQuery(clusterUrl: string, database: string, query: string): Promise<any> {
    try {
      const client = await KustoService.getClient(clusterUrl, database);
      const response = await client.execute(database, query);
      return response.primaryResults[0].toJSON();
    } catch (error: any) {
      console.error("Error executing Kusto query:", error.message);
      throw new Error(`Error executing query: ${error.message}`);
    }
  }

  /**
   * Get list of tables in the database
   */
  public static async getTables(clusterUrl: string, database: string): Promise<{ TableName: string; IsExternal: boolean }[]> {
    try {
      // Query for internal tables
      const internalQuery = `.show tables | project TableName, IsExternal = false`;
      const internalResult = await KustoService.executeQuery(clusterUrl, database, internalQuery);

      // Query for external tables
      const externalQuery = `.show external tables | project TableName, IsExternal = true`;
      const externalResult = await KustoService.executeQuery(clusterUrl, database, externalQuery);

      // Combine results
      const internalTables = internalResult.data.map((item: any) => ({
        TableName: item.TableName,
        IsExternal: false,
      }));

      const externalTables = externalResult.data.map((item: any) => ({
        TableName: item.TableName,
        IsExternal: true,
      }));

      return [...internalTables, ...externalTables];
    } catch (error: any) {
      console.error("Error retrieving tables:", error.message);
      // Return an empty array instead of throwing when no tables are found
      return [];
    }
  }

  /**
   * Get detailed schema information for all tables in the database
   */
  public static async getAllTableSchemas(clusterUrl: string, database: string): Promise<Record<string, TableInfo>> {
    try {
      const query = `.show tables | project TableName`;
      const tables = await KustoService.executeQuery(clusterUrl, database, query);
      const tableNames = tables.data.map((item: any) => item.TableName);

      const schemaInfo: Record<string, TableInfo> = {};

      // For each table, get its schema details
      for (const tableName of tableNames) {
        try {
          const tableSchema = await KustoService.getTableSchema(clusterUrl, database, tableName);
          schemaInfo[tableName] = tableSchema;
        } catch (error) {
          console.warn(`Skipping schema retrieval for table ${tableName} due to error`);
        }
      }

      return schemaInfo;
    } catch (error) {
      console.error("Error retrieving all table schemas:", error);
      return {}; // Return an empty object for graceful failure
    }
  }

  /**
   * Get the schema for a specific table
   */
  public static async getTableSchema(clusterUrl: string, database: string, tableName: string, isExternal: boolean = false): Promise<any> {
    try {
      const query = isExternal ? `.show external table ['${tableName}'] schema as json` : `.show table ['${tableName}'] schema as json`;
      const result = await KustoService.executeQuery(clusterUrl, database, query);

      if (!result || !result.data || result.data.length === 0) {
        throw new Error(`No schema found for table ${tableName}`);
      }

      return JSON.parse(result.data[0].Schema);
    }
    catch (error: any) {
      console.error(`Error getting schema for table ${tableName}:`, error.message);
      throw new Error(`Failed to get schema for table ${tableName}: ${error.message}`);
    }
  }

  /**
   * Get sample data from a table (top N rows)
   */
  public static async getTableSample(clusterUrl: string, database: string, tableName: string, sampleSize: number = 10): Promise<any[]> {
    try {
      const query = `${tableName} | take ${sampleSize}`;
      return await KustoService.executeQuery(clusterUrl, database, query);
    } catch (error: any) {
      console.error(`Error getting sample data from table ${tableName}:`, error.message);
      throw new Error(`Failed to get sample data from table ${tableName}: ${error.message}`);
    }
  }

  /**
   * Check if the connection to Kusto is working properly
   */
  public static async testConnection(clusterUrl: string, database: string): Promise<boolean> {
    try {
      await KustoService.getTables(clusterUrl, database);
      return true;
    } catch (error) {
      return false;
    }
  }
}