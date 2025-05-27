import { z } from 'zod';
import { OpenApiService } from '../services/openapi-service';
import { safeStringify } from '../utils/json-utils';

export const getOpenApiOperationsTool = {
    name: 'get_openapi_operations',
    description: `Gets detailed information about operations for a specific endpoint in an OpenAPI schema.
  
  This tool retrieves comprehensive details about all HTTP methods (operations) available for
  a specific endpoint path in an OpenAPI schema, including parameters, request bodies,
  responses and other metadata.
  
  ## Parameters:
  - schemaUrl: [Required] URL where the OpenAPI schema is published
  - path: [Required] The specific API path to get operations for (e.g., "/pets" or "/users/{id}")
  - authType: [Optional] Authentication method if the schema requires auth: 'bearer', 'basic', 'interactive', or 'none'
  - authConfig: [Optional] Authentication configuration object (required if authType is not 'none')
    - token: Bearer token (required for authType='bearer')
    - username: Username (required for authType='basic')
    - password: Password (optional for authType='basic')
    - clientId: Client ID (required for authType='interactive')
    - tenantId: Tenant ID (optional for authType='interactive', defaults to 'common')
    
  ## Example usage:
  - get_openapi_operations({
      schemaUrl: "https://petstore.swagger.io/v2/swagger.json",
      path: "/pets"
    })
  `,
    parameters: {
        schemaUrl: z.string().describe('URL where the OpenAPI schema is published'),
        path: z.string().describe('The specific API path to get operations for (e.g., "/pets")'),
        authType: z.enum(['bearer', 'basic', 'interactive', 'none']).default('none').describe('Authentication method if the schema requires auth'),
        authConfig: z.object({
            token: z.string().optional().describe('Bearer token for token-based authentication'),
            username: z.string().optional().describe('Username for basic authentication'),
            password: z.string().optional().describe('Password for basic authentication'),
            // For interactive auth
            clientId: z.string().optional().describe('Client ID for interactive authentication'),
            tenantId: z.string().optional().describe('Tenant ID for interactive authentication (defaults to "common")'),
            authority: z.string().optional().describe('Authority URL for authentication'),
            scopes: z.array(z.string()).optional().describe('Scopes required for API access'),
            redirectUri: z.string().optional().describe('Redirect URI for authentication callback')
        }).optional().describe('Authentication configuration')
    },
    handler: async ({ schemaUrl, path, authType, authConfig }: {
        schemaUrl: string;
        path: string;
        authType?: 'bearer' | 'basic' | 'interactive' | 'none';
        authConfig?: {
            token?: string;
            username?: string;
            password?: string;
            // For interactive auth
            clientId?: string;
            tenantId?: string;
            authority?: string;
            scopes?: string[];
            redirectUri?: string;
        };
    }) => {
        try {
            const operations = await OpenApiService.getOperations(schemaUrl, path, authType, authConfig);

            // Format the operations for better readability
            const formattedOperations = operations.map(op => {
                return {
                    method: op.method,
                    operationId: op.operationId || '',
                    summary: op.summary || '',
                    description: op.description || '',
                    parameters: op.parameters || [],
                    requestBody: op.requestBody || null,
                    responses: op.responses || {},
                    tags: op.tags || []
                };
            }); 
            return {
                content: [{
                    type: 'text',
                    text: safeStringify(formattedOperations)
                } as const]
            };
        } catch (error: any) {
            console.error('Error fetching OpenAPI operations:', error);
            return {
                content: [{
                    type: 'text',
                    text: `Error fetching OpenAPI operations: ${error.message || 'Unknown error'}`
                } as const],
                isError: true
            };
        }
    }
};
