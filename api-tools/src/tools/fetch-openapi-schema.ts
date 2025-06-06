import { z } from 'zod';
import { OpenApiService } from '../services/openapi-service';
import { safeStringify } from '../utils/json-utils';

export const fetchOpenApiSchemaTool = {
    name: 'fetch_openapi_schema',    description: `Fetches and parses an OpenAPI schema from a URL.
  
  This tool downloads and parses an OpenAPI schema from the provided URL,
  extracting key information such as API title, version, and available endpoints.
  If the exact URL doesn't contain a valid OpenAPI schema, the tool will automatically
  try common schema endpoints (like "/swagger.json", "/openapi.json", "/api-docs.json") to locate
  the schema.
  
  ## Parameters:
  - schemaUrl: [Required] URL where the OpenAPI schema is published or the API base URL
  - authType: [Optional] Authentication method if the schema requires auth: 'bearer', 'basic', 'interactive', or 'none'
  - authConfig: [Optional] Authentication configuration object (required if authType is not 'none')
    - token: Bearer token (required for authType='bearer')
    - username: Username (required for authType='basic')
    - password: Password (optional for authType='basic')
    - clientId: Client ID (required for authType='interactive')
    - tenantId: Tenant ID (optional for authType='interactive', defaults to 'common')
      ## Example usage:
  - Public Schema with direct path: fetch_openapi_schema({schemaUrl: "https://petstore.swagger.io/v2/swagger.json"})
  - Public Schema with base URL (auto-discovery): fetch_openapi_schema({schemaUrl: "https://petstore.swagger.io"})
  - Protected Schema: fetch_openapi_schema({
      schemaUrl: "https://api.example.com/swagger.json", 
      authType: "bearer",
      authConfig: {token: "your-token-here"}
    })
  - Protected API with auto-discovery: fetch_openapi_schema({
      schemaUrl: "https://api.example.com", 
      authType: "bearer",
      authConfig: {token: "your-token-here"}
    })
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
            const schema = await OpenApiService.fetchSchema(schemaUrl, authType, authConfig); 
            return {
                content: [{
                    type: 'text',
                    text: safeStringify(schema)
                } as const]
            };
        }
        catch (error: any) {
            console.error('Error fetching OpenAPI schema:', error);
            return {
                content: [{
                    type: 'text',
                    text: `Error fetching OpenAPI schema: ${error.message || 'Unknown error'}`
                } as const],
                isError: true
            };
        }
    }
};
