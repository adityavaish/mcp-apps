import { z } from 'zod';
import { ApiService } from '../services/api-service';

export const apiCallTool = {  name: 'call_api',  description: `Makes an API call to a specified endpoint with optional authentication.
  
  This tool supports the following authentication methods:
  - Bearer token authentication
  - Basic authentication with username/password
  - Interactive device code authentication
  - No authentication (public APIs)
  
  ## Parameters:
  - endpoint: [Required] The base URL of the API endpoint (e.g., https://api.example.com)
  - method: [Required] HTTP method to use (GET, POST, PUT, PATCH, DELETE)
  - path: [Optional] Path to append to the endpoint URL (e.g., 'v1/users')
  - queryParams: [Optional] Query parameters as key-value pairs (e.g., {"page": "1", "limit": "10"})
  - headers: [Optional] HTTP headers as key-value pairs (e.g., {"Content-Type": "application/json"})
  - body: [Optional] Request body data for POST, PUT, PATCH requests
  - authType: [Required] Authentication method: 'bearer', 'basic', 'interactive', or 'none'
  - authConfig: [Required for auth] Configuration object with authentication details:
    - token: Bearer token value (required for authType='bearer')
    - username: Username (required for authType='basic')
    - password: Password (optional for authType='basic')
    - clientId: Client ID (required for authType='interactive')
    - tenantId: Tenant ID (optional for authType='interactive', defaults to 'common')
    - authority: Authority URL (optional for authType='interactive')
    - scopes: Array of OAuth scopes (optional for authType='interactive')
    - redirectUri: Redirect URI (optional for authType='interactive')
    - useBroker: Use Windows broker authentication (optional for authType='interactive')
  
  ## Example usage:
  - To call a public REST API:
    call_api({endpoint: "https://jsonplaceholder.typicode.com", method: "GET", path: "posts/1", authType: "none"})
  
  - To call an API with Bearer token:
    call_api({endpoint: "https://api.example.com", method: "GET", path: "users/me", authType: "bearer", authConfig: {token: "your-token-here"}})
  
  - To call an API with Basic auth:
    call_api({endpoint: "https://api.example.com", method: "GET", path: "protected-resource", authType: "basic", authConfig: {username: "user", password: "pass"}})
  
  - To use interactive device code auth:
    call_api({endpoint: "https://graph.microsoft.com", method: "GET", path: "v1.0/me", authType: "interactive", authConfig: {clientId: "your-client-id", scopes: ["User.Read"]}})
  
  - To POST data to an API:
    call_api({endpoint: "https://api.example.com", method: "POST", path: "users", body: {"name": "John", "email": "john@example.com"}, headers: {"Content-Type": "application/json"}, authType: "none"})
  `,
  parameters: {
    endpoint: z.string().describe('The base URL of the API endpoint to call'),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).describe('The HTTP method to use'),
    path: z.string().optional().describe('Optional path to append to the endpoint URL'),
    queryParams: z.record(z.string()).optional().describe('Optional query parameters to include'),
    headers: z.record(z.string()).optional().describe('Optional headers to include'),
    body: z.any().optional().describe('Optional body data to include'),
    authType: z.enum(['bearer', 'basic', 'interactive', 'none']).default('none').describe('Authentication method to use'),
    authConfig: z.object({
      token: z.string().optional().describe('Bearer token for token-based authentication'),
      username: z.string().optional().describe('Username for basic authentication'),
      password: z.string().optional().describe('Password for basic authentication'),
      // For interactive auth
      clientId: z.string().optional().describe('Client ID for interactive authentication'),
      tenantId: z.string().optional().describe('Tenant ID for interactive authentication (defaults to "common")'),
      authority: z.string().optional().describe('Authority URL for authentication'),
      scopes: z.array(z.string()).optional().describe('Scopes required for API access'),
      redirectUri: z.string().optional().describe('Redirect URI for authentication callback'),
      useBroker: z.boolean().optional().default(true).describe('Use Windows broker authentication (WAM)')
    }).optional().describe('Authentication configuration')
  },
  handler: async ({ endpoint, method, path, queryParams, headers, body, authType, authConfig }: {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path?: string;
    queryParams?: Record<string, string>;
    headers?: Record<string, string>;
    body?: any;
    authType?: 'bearer' | 'basic' | 'interactive' | 'none';
    authConfig?: {
      token?: string;
      username?: string;
      password?: string;
      // For interactive auth
      clientId?: string;
      tenantId?: string;
      authority?: string;
      scopes?: string[] | undefined;
      redirectUri?: string;
      useBroker?: boolean;
    };
  }) => {    
    try {
      const response = await ApiService.callApi({
        endpoint,
        method,
        path,
        queryParams,
        headers,
        body,
        authType,
        authConfig
      });
      
      // Create a safe-to-stringify copy of the response without circular references
      const safeResponse = {
        success: response.success,
        status: response.status,
        data: response.data,
        error: response.error,
        headers: response.headers
      };
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(safeResponse, null, 2)
        } as const]
      };
    } catch (error: any) {
      console.error('Error making API call:', error);
      return {
        content: [{
          type: 'text',
          text: `Error making API call: ${error.message || 'Unknown error'}`
        } as const],
        isError: true
      };
    }
  }
};
