import { KustoConnectionStringBuilder, Client as KustoClient } from "azure-kusto-data";

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

interface CachedClient {
  client: KustoClient;
  database: string;
  lastUsed: number;
}

export class KustoService {
  private static clientCache: Map<string, CachedClient> = new Map();
  
  private static MAX_CACHE_SIZE = 10;
  
  private static CACHE_EXPIRATION_MS = 30 * 60 * 1000;

  private static createConnectionString(clusterUrl: string): any {
    console.log("Using user prompt authentication. Please log in interactively.");
    return KustoConnectionStringBuilder.withUserPrompt(clusterUrl);
  }
  
  private static cleanupCache(): void {
    if (KustoService.clientCache.size <= KustoService.MAX_CACHE_SIZE) {
      const now = Date.now();
      for (const [url, cachedClient] of KustoService.clientCache.entries()) {
        if (now - cachedClient.lastUsed > KustoService.CACHE_EXPIRATION_MS) {
          console.log(`Removing expired cached client for ${url}`);
          KustoService.clientCache.delete(url);
        }
      }
      return;
    }
    
    const entries = Array.from(KustoService.clientCache.entries())
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
      
    while (entries.length > KustoService.MAX_CACHE_SIZE) {
      const [url] = entries.shift()!;
      console.log(`Removing oldest cached client for ${url}`);
      KustoService.clientCache.delete(url);
    }
  }

  /**
   * Get a cached client for a specific cluster URL and database, or create a new one
   */
  private static getClient(clusterUrl: string, database: string): KustoClient {
    if (!clusterUrl) {
      throw new Error("Cluster URL is required");
    }

    if (!database) {
      throw new Error("Database name is required");
    }

    try {
      // Check if we already have a cached client for this cluster URL
      const cachedClient = KustoService.clientCache.get(clusterUrl);
      
      if (cachedClient && cachedClient.database === database) {
        console.log(`Using cached Kusto client for ${clusterUrl}`);
        // Update the last used timestamp
        cachedClient.lastUsed = Date.now();
        return cachedClient.client;
      }
      
      // No cached client found, create a new one
      console.log(`Creating new Kusto client for ${clusterUrl}`);
      const connectionString = KustoService.createConnectionString(clusterUrl);
      const client = new KustoClient(connectionString);
      
      // Add to cache
      KustoService.clientCache.set(clusterUrl, {
        client: client,
        database: database,
        lastUsed: Date.now()
      });
      
      // Clean up cache if needed
      KustoService.cleanupCache();
      
      return client;
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
      const client = KustoService.getClient(clusterUrl, database);
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