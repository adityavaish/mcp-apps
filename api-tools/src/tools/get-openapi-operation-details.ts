import { z } from 'zod';
import { OpenApiService } from '../services/openapi-service';
import { safeStringify } from '../utils/json-utils';

// Make sure to export the tool
export const getOpenApiOperationDetailsTool = {
    name: 'get_openapi_operation_details',
    description: `Gets comprehensive details about a specific operation (by operationId) in an OpenAPI schema.
  
  This tool extracts detailed information about a specific API operation identified by its operationId,
  including parameters, request body schema, response schemas, and examples.
    ## Parameters:
  - schemaUrl: [Required] URL where the OpenAPI schema is published or the API base URL (will auto-discover the schema)
  - operationId: [Required] The operation ID to retrieve details for (e.g., "getPetById", "createUser")
  - authType: [Optional] Authentication method if the schema requires auth: 'bearer', 'basic', 'interactive', or 'none'
  - authConfig: [Optional] Authentication configuration object (required if authType is not 'none')
    - token: Bearer token (required for authType='bearer')
    - username: Username (required for authType='basic')
    - password: Password (optional for authType='basic')
    - clientId: Client ID (required for authType='interactive')
    - tenantId: Tenant ID (optional for authType='interactive', defaults to 'common')
    
  ## Example usage:
  - get_openapi_operation_details({
      schemaUrl: "https://petstore.swagger.io/v2/swagger.json",
      operationId: "getPetById"
    })
  `,
    parameters: {
        schemaUrl: z.string().describe('URL where the OpenAPI schema is published'),
        operationId: z.string().describe('The operation ID to retrieve details for (e.g., "getPetById")'),
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
    handler: async ({ schemaUrl, operationId, authType, authConfig }: {
        schemaUrl: string;
        operationId: string;
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
            // First get all endpoints
            const schema = await OpenApiService.fetchSchema(schemaUrl, authType, authConfig);

            // Find the operation by operationId
            let foundOperation = null;
            let foundPath = null;
            let foundMethod = null;

            for (const endpoint of schema.endpoints) {
                for (const operation of endpoint.operations) {
                    if (operation.operationId === operationId) {
                        foundOperation = operation;
                        foundPath = endpoint.path;
                        foundMethod = operation.method;
                        break;
                    }
                }
                if (foundOperation) break;
            }

            if (!foundOperation) {
                throw new Error(`Operation with ID '${operationId}' not found in the schema.`);
            }

            // Format the operation details for better readability
            const operationDetails = {
                path: foundPath,
                method: foundMethod,
                operationId: foundOperation.operationId,
                summary: foundOperation.summary || '',
                description: foundOperation.description || '',
                parameters: foundOperation.parameters || [],
                requestBody: foundOperation.requestBody || null,
                responses: foundOperation.responses || {},
                tags: foundOperation.tags || []
            };

            // Create a sample request based on the operation details
            const sampleRequest = generateSampleRequest(operationDetails);

            // Combine the details and sample
            const result = {
                operation: operationDetails,
                sample: sampleRequest
            };

            return {
                content: [{
                    type: 'text',
                    text: safeStringify(result)
                } as const]
            };
        } catch (error: any) {
            console.error('Error fetching OpenAPI operation details:', error);
            return {
                content: [{
                    type: 'text',
                    text: `Error fetching OpenAPI operation details: ${error.message || 'Unknown error'}`
                } as const],
                isError: true
            };
        }
    }
};

/**
 * Generates a sample request object based on operation details
 */
function generateSampleRequest(operation: any): any {
    const result: any = {
        url: `${operation.path}`,
        method: operation.method,
        headers: {}
    };

    // Add path parameters to URL
    const pathParams = (operation.parameters || []).filter((p: any) => p.in === 'path');
    if (pathParams.length > 0) {
        let url = operation.path;
        for (const param of pathParams) {
            url = url.replace(`{${param.name}}`, `<${param.name}>`);
        }
        result.url = url;
    }

    // Add query parameters
    const queryParams = (operation.parameters || []).filter((p: any) => p.in === 'query');
    if (queryParams.length > 0) {
        result.queryParameters = {};
        for (const param of queryParams) {
            result.queryParameters[param.name] = generateExampleValue(param);
        }
    }

    // Add headers
    const headerParams = (operation.parameters || []).filter((p: any) => p.in === 'header');
    if (headerParams.length > 0) {
        for (const param of headerParams) {
            result.headers[param.name] = generateExampleValue(param);
        }
    }

    // Add content type if there's a request body
    if (operation.requestBody) {
        result.headers['Content-Type'] = 'application/json';
    }

    // Add body if applicable (POST, PUT, PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(operation.method) && operation.requestBody) {
        // Get the JSON schema content if available
        const contentTypes = Object.keys(operation.requestBody.content || {});
        if (contentTypes.length > 0 && contentTypes.includes('application/json')) {
            const schema = operation.requestBody.content['application/json'].schema;
            result.body = generateExampleFromSchema(schema);
        } else if (contentTypes.length > 0) {
            // Use the first content type
            const firstContentType = contentTypes[0];
            result.headers['Content-Type'] = firstContentType;
            const schema = operation.requestBody.content[firstContentType].schema;
            result.body = generateExampleFromSchema(schema);
        }
    }

    return result;
}

/**
 * Generates an example value based on parameter definition
 */
function generateExampleValue(param: any): any {
    // Use example if provided
    if (param.example !== undefined) {
        return param.example;
    }

    // Use default if provided
    if (param.default !== undefined) {
        return param.default;
    }

    // Generate based on type
    if (!param.schema) return 'example';

    const schema = param.schema;
    return generateExampleFromSchema(schema);
}

/**
 * Generates an example value from a JSON schema
 */
function generateExampleFromSchema(schema: any): any {
    if (!schema) return 'example';

    // Use example if provided
    if (schema.example !== undefined) {
        return schema.example;
    }

    // Use default if provided
    if (schema.default !== undefined) {
        return schema.default;
    }

    // Handle different types
    const type = schema.type;

    switch (type) {
        case 'string':
            if (schema.enum && schema.enum.length > 0) {
                return schema.enum[0];
            }
            if (schema.format === 'date-time') return new Date().toISOString();
            if (schema.format === 'date') return new Date().toISOString().split('T')[0];
            if (schema.format === 'email') return 'user@example.com';
            if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
            return 'string';

        case 'integer':
        case 'number':
            if (schema.enum && schema.enum.length > 0) {
                return schema.enum[0];
            }
            return 0;

        case 'boolean':
            return false;

        case 'array':
            if (schema.items) {
                const itemExample = generateExampleFromSchema(schema.items);
                return [itemExample];
            }
            return [];

        case 'object':
            const result: any = {};
            if (schema.properties) {
                for (const propName in schema.properties) {
                    result[propName] = generateExampleFromSchema(schema.properties[propName]);
                }
            }
            return result;

        default:
            return 'example';
    }
}
