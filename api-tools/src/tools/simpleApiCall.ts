import { z } from 'zod';
import { ApiService } from '../services/simpleApiService';

export const apiCallTool = {
  name: 'call_api',
  description: `Makes an API call to a specified endpoint with optional authentication.
  
  This tool supports the following authentication methods:
  - Bearer token authentication
  - Basic authentication with username/password
  
  Example usage:
  - To call a public REST API: Call with endpoint, method and no auth
  - To call an API with Bearer token: Include authType="bearer" and token in authConfig
  - To call an API with Basic auth: Include authType="basic" with username/password in authConfig
  `,
  parameters: {
    endpoint: z.string().describe('The base URL of the API endpoint to call'),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).describe('The HTTP method to use'),
    path: z.string().optional().describe('Optional path to append to the endpoint URL'),
    queryParams: z.record(z.string()).optional().describe('Optional query parameters to include'),
    headers: z.record(z.string()).optional().describe('Optional headers to include'),
    body: z.any().optional().describe('Optional body data to include'),
    authType: z.enum(['bearer', 'basic', 'none']).default('none').describe('Authentication method to use'),
    authConfig: z.object({
      token: z.string().optional().describe('Bearer token for token-based authentication'),
      username: z.string().optional().describe('Username for basic authentication'),
      password: z.string().optional().describe('Password for basic authentication')
    }).optional().describe('Authentication configuration')
  },
  handler: async ({ endpoint, method, path, queryParams, headers, body, authType, authConfig }: {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path?: string;
    queryParams?: Record<string, string>;
    headers?: Record<string, string>;
    body?: any;
    authType?: 'bearer' | 'basic' | 'none';
    authConfig?: {
      token?: string;
      username?: string;
      password?: string;
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
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
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
