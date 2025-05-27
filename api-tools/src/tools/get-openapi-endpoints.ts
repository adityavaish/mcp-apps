import { z } from 'zod';
import { OpenApiService } from '../services/openapi-service';
import { safeStringify } from '../utils/json-utils';

export const getOpenApiEndpointsTool = {
    name: 'get_openapi_endpoints',
    description: `Lists all available endpoints from an OpenAPI schema.
  
  This tool extracts and returns all paths/endpoints defined in an OpenAPI schema,
  grouped by path with their associated HTTP methods.
    ## Parameters:
  - schemaUrl: [Required] URL where the OpenAPI schema is published or the API base URL (will auto-discover the schema)
  - authType: [Optional] Authentication method if the schema requires auth: 'bearer', 'basic', 'interactive', or 'none'
  - authConfig: [Optional] Authentication configuration object (required if authType is not 'none')
    - token: Bearer token (required for authType='bearer')
    - username: Username (required for authType='basic')
    - password: Password (optional for authType='basic')
    - clientId: Client ID (required for authType='interactive')
    - tenantId: Tenant ID (optional for authType='interactive', defaults to 'common')
    
  ## Example usage:
  - get_openapi_endpoints({schemaUrl: "https://petstore.swagger.io/v2/swagger.json"})
  `,
    parameters: {
        schemaUrl: z.string().describe('URL where the OpenAPI schema is published'),
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
    handler: async ({ schemaUrl, authType, authConfig }: {
        schemaUrl: string;
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
            const endpoints = await OpenApiService.getEndpoints(schemaUrl, authType, authConfig);

            // Format the endpoints for better readability
            const formattedEndpoints = endpoints.map(endpoint => {
                return {
                    path: endpoint.path,
                    methods: endpoint.operations.map(op => ({
                        method: op.method,
                        operationId: op.operationId || '',
                        summary: op.summary || '',
                        tags: op.tags || []
                    }))
                };
            }); 
            return {
                content: [{
                    type: 'text',
                    text: safeStringify(formattedEndpoints)
                } as const]
            };
        } catch (error: any) {
            console.error('Error fetching OpenAPI endpoints:', error);
            return {
                content: [{
                    type: 'text',
                    text: `Error fetching OpenAPI endpoints: ${error.message || 'Unknown error'}`
                } as const],
                isError: true
            };
        }
    }
};
