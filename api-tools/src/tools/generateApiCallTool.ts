import { z } from 'zod';
import { ApiService } from '../services/simpleApiService';

// Tool to generate API call templates based on OpenAPI specifications
export const generateApiCallTool = {
  name: 'generate_api_call',
  description: `This tool generates a template for an API call based on an OpenAPI specification.
  It can fetch the specification from a URL and use an operation ID to generate the API call template.
  
  Inputs:
  - specUrl: URL to the OpenAPI specification document
  - operationId: The specific operation ID to generate a template for
  - serverIndex: Optional index of the server to use from the OpenAPI spec (defaults to 0)
  
  The tool returns a template that can be used with the call_api tool, including endpoint, path,
  method, and required parameters.`,
  parameters: {
    specUrl: z.string().describe('URL to the OpenAPI specification document'),
    operationId: z.string().describe('The operation ID to generate a template for'),
    serverIndex: z.number().optional().default(0).describe('Index of the server to use from the spec')
  },
  handler: async ({ specUrl, operationId, serverIndex = 0 }: {
    specUrl: string;
    operationId: string;
    serverIndex?: number;
  }) => {
    try {
      // Fetch the OpenAPI spec
      const response = await ApiService.callApi({
        endpoint: specUrl,
        method: 'GET'
      });
      
      if (!response.success) {
        throw new Error(`Failed to fetch OpenAPI spec: ${response.error}`);
      }
      
      const spec = response.data;
      
      // Find the operation by ID
      let operation: any = null;
      let path: string = '';
      let method: string = '';
      
      // Search for the operation in the spec
      for (const [pathKey, pathItem] of Object.entries(spec.paths || {})) {
        for (const [methodKey, op] of Object.entries(pathItem as any)) {
          if (methodKey === 'parameters') continue;
          
          if ((op as any).operationId === operationId) {
            operation = op;
            path = pathKey;
            method = methodKey.toUpperCase();
            break;
          }
        }
        if (operation) break;
      }
      
      if (!operation) {
        throw new Error(`Operation ID '${operationId}' not found in the OpenAPI spec`);
      }
      
      // Get the server URL
      const servers = spec.servers || [];
      if (!servers.length) {
        throw new Error('No servers defined in the OpenAPI spec');
      }
      
      const serverUrl = servers[Math.min(serverIndex, servers.length - 1)].url;
      
      // Build the template
      const template: any = {
        endpoint: serverUrl,
        method,
        path: path.startsWith('/') ? path.substring(1) : path,
        queryParams: {},
        headers: {},
        body: undefined
      };
      
      // Add parameters
      const parameters = [...(operation.parameters || [])];
      const pathParameters = (spec.paths[path] as any).parameters || [];
      parameters.push(...pathParameters);
      
      // Process parameters
      for (const param of parameters) {
        if (param.in === 'query') {
          // Add query parameter placeholder
          template.queryParams[param.name] = `<${param.name}${param.required ? ' (required)' : ''}>`;
        } else if (param.in === 'header') {
          // Add header placeholder
          template.headers[param.name] = `<${param.name}${param.required ? ' (required)' : ''}>`;
        }
        // Path parameters are handled in the path string
      }
      
      // Handle request body if present
      if (operation.requestBody) {
        const contentTypes = Object.keys(operation.requestBody.content || {});
        if (contentTypes.length) {
          const preferredType = contentTypes.includes('application/json') 
            ? 'application/json' 
            : contentTypes[0];
          
          template.headers['Content-Type'] = preferredType;
          
          // Create a body template based on the schema
          const schema = operation.requestBody.content[preferredType].schema;
          if (schema) {
            template.body = generateSchemaExample(schema);
          }
        }
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(template, null, 2)
        } as const]
      };
    } catch (error: any) {
      console.error('Error generating API call template:', error);
      return {
        content: [{
          type: 'text',
          text: `Error generating API call template: ${error.message || 'Unknown error'}`
        } as const],
        isError: true
      };
    }
  }
};

// Helper function to generate an example value from a JSON Schema
function generateSchemaExample(schema: any): any {
  if (!schema) return undefined;
  
  // Handle $ref
  if (schema.$ref) {
    // In a real implementation, this would resolve the reference
    return { "$ref": schema.$ref };
  }
  
  // Handle oneOf, anyOf, allOf
  if (schema.oneOf || schema.anyOf) {
    const options = schema.oneOf || schema.anyOf;
    if (options && options.length) {
      return generateSchemaExample(options[0]);
    }
  }
  
  if (schema.allOf) {
    // Merge all schemas in allOf
    const result: any = {};
    for (const subSchema of schema.allOf) {
      const example = generateSchemaExample(subSchema);
      if (typeof example === 'object' && example !== null) {
        Object.assign(result, example);
      }
    }
    return result;
  }
  
  // Handle different types
  switch (schema.type) {
    case 'object':
      const result: any = {};
      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          result[propName] = generateSchemaExample(propSchema as any);
        }
      }
      return result;
      
    case 'array':
      if (schema.items) {
        return [generateSchemaExample(schema.items)];
      }
      return [];
      
    case 'string':
      if (schema.enum && schema.enum.length) {
        return schema.enum[0];
      }
      if (schema.format === 'date') return "2023-01-01";
      if (schema.format === 'date-time') return "2023-01-01T00:00:00Z";
      if (schema.format === 'email') return "user@example.com";
      if (schema.format === 'uuid') return "00000000-0000-0000-0000-000000000000";
      return "<string value>";
      
    case 'number':
    case 'integer':
      if (schema.enum && schema.enum.length) {
        return schema.enum[0];
      }
      return 0;
      
    case 'boolean':
      return false;
      
    case 'null':
      return null;
      
    default:
      return undefined;
  }
}
