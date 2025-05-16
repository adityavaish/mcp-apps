import { z } from "zod";
import { ApiService } from '../services/apiService';

// Tool to make API calls with authentication
export const apiCallTool = {
  name: "call_api",
  description: `This tool makes authenticated API calls to a specified endpoint.
  It supports various authentication methods including Azure Identity and MSAL.
  
  Inputs:
  - endpoint: The base URL of the API endpoint to call
  - method: The HTTP method to use (GET, POST, PUT, PATCH, DELETE)
  - path: Optional path to append to the endpoint URL
  - queryParams: Optional query parameters to include in the request
  - headers: Optional headers to include in the request
  - body: Optional body data to include in the request
  - authType: Authentication method to use (msal, azure-identity, none)
  - authConfig: Configuration for the authentication method
  
  Example authConfig for MSAL:
  {
    "clientId": "your-client-id",
    "tenantId": "your-tenant-id",
    "scopes": ["https://graph.microsoft.com/.default"]
  }
  
  Example authConfig for Azure Identity:
  {
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "tenantId": "your-tenant-id",
    "scopes": ["https://management.azure.com/.default"]
  }
  
  The tool returns the API response including status code, headers, and data.`,
  parameters: {
    endpoint: z.string().describe("The base URL of the API endpoint to call"),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).describe("The HTTP method to use"),
    path: z.string().optional().describe("Optional path to append to the endpoint URL"),
    queryParams: z.record(z.string()).optional().describe("Optional query parameters to include"),
    headers: z.record(z.string()).optional().describe("Optional headers to include"),
    body: z.any().optional().describe("Optional body data to include"),
    authType: z.enum(["msal", "azure-identity", "none"]).default("none").describe("Authentication method to use"),
    authConfig: z.object({
      clientId: z.string().optional().describe("The client ID for authentication"),
      authority: z.string().optional().describe("The authority URL for MSAL authentication"),
      tenantId: z.string().optional().describe("The tenant ID for Azure authentication"),
      scopes: z.array(z.string()).optional().describe("The scopes required for API access"),
      clientSecret: z.string().optional().describe("The client secret for authentication"),
      managedIdentityClientId: z.string().optional().describe("The managed identity client ID to use")
    }).optional().describe("Configuration for the authentication method")
  },  handler: async (params: any) => {
    try {
      // Make the API call using our service
      const response = await ApiService.callApi({
        endpoint: params.endpoint,
        method: params.method,
        path: params.path,
        queryParams: params.queryParams,
        headers: params.headers,
        body: params.body,
        authType: params.authType,
        authConfig: params.authConfig
      });
      
      // Format response to match MCP format
      return {
        content: [{
          type: "text",
          text: JSON.stringify(response, null, 2)
        } as const]
      };
    } catch (error: any) {
      console.error('Error making API call:', error);
      return {
        content: [{
          type: "text",
          text: `Error making API call: ${error.message || 'Unknown error'}`
        } as const],
        isError: true
      };
    }
  }
};

// Tool to explore OpenAPI specifications
export const getApiOperationsTool = {
  name: "get_api_operations",
  description: `This tool retrieves information about available operations from an OpenAPI specification.
  It can fetch the specification from a URL or use a provided specification object.
  
  Inputs:
  - specUrl: URL to the OpenAPI specification document
  - specContent: The OpenAPI specification content as an object (alternative to specUrl)
  - operationId: Optional specific operation ID to retrieve
  
  The tool returns a list of API operations including paths, methods, parameters, and other metadata.`,
  parameters: {
    specUrl: z.string().optional().describe("URL to the OpenAPI specification document"),
    specContent: z.any().optional().describe("The OpenAPI specification content as an object"),
    operationId: z.string().optional().describe("Optional specific operation ID to retrieve")
  },
  handler: async (params: any) => {
    try {
      // Ensure at least one of specUrl or specContent is provided
      if (!params.specUrl && !params.specContent) {
        throw new Error('Either specUrl or specContent must be provided');
      }
      
      // Fetch the OpenAPI spec if a URL is provided
      let specData;
      if (params.specUrl) {
        const response = await ApiService.callApi({
          endpoint: params.specUrl,
          method: 'GET',
          authType: 'none'
        });
        
        if (!response.success) {
          throw new Error(`Failed to fetch OpenAPI spec: ${response.error}`);
        }
        
        specData = response.data;
      } else if (params.specContent) {
        specData = params.specContent;
      }
      
      // Process the OpenAPI spec to extract operations
      const operations = extractOperationsFromSpec(specData, params.operationId);
        return {
        content: [{
          type: "text",
          text: JSON.stringify({ operations }, null, 2)
        } as const]
      };
    } catch (error: any) {
      console.error('Error processing API operations:', error);
      return {
        content: [{
          type: "text",
          text: `Error processing API operations: ${error.message || 'Unknown error'}`
        } as const],
        isError: true
      };
    }
  }
};

// Helper function to extract operations from an OpenAPI spec
function extractOperationsFromSpec(spec: any, operationId?: string) {
  const operations: any[] = [];
  
  // Process each path and method in the OpenAPI spec
  if (spec.paths) {
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (method === 'parameters') continue; // Skip path-level parameters
        
        const op = operation as any;
        
        // Skip if looking for a specific operationId and this doesn't match
        if (operationId && op.operationId !== operationId) {
          continue;
        }
        
        operations.push({
          path,
          method: method.toUpperCase(),
          operationId: op.operationId,
          summary: op.summary,
          description: op.description,
          parameters: op.parameters,
          requestBody: op.requestBody,
          responses: op.responses,
          security: op.security
        });
        
        // If we found the specific operationId, no need to continue
        if (operationId && op.operationId === operationId) {
          break;
        }
      }
    }
  }
  
  return operations;
}