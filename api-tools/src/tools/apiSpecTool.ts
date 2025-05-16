import { z } from 'zod';
import { ApiService } from '../services/simpleApiService';

// Tool to explore OpenAPI specifications
export const getApiOperationsTool = {
  name: 'get_api_operations',
  description: `This tool retrieves information about available operations from an OpenAPI specification.
  It can fetch the specification from a URL or use a provided specification object.
  
  Inputs:
  - specUrl: URL to the OpenAPI specification document
  - specJson: The OpenAPI specification content as a JSON string (alternative to specUrl)
  - operationId: Optional specific operation ID to retrieve
  
  The tool returns a list of API operations including paths, methods, parameters, and other metadata.`,
  parameters: {
    specUrl: z.string().optional().describe('URL to the OpenAPI specification document'),
    specJson: z.string().optional().describe('The OpenAPI specification content as a JSON string'),
    operationId: z.string().optional().describe('Optional specific operation ID to retrieve')
  },
  handler: async ({ specUrl, specJson, operationId }: {
    specUrl?: string;
    specJson?: string;
    operationId?: string;
  }) => {
    try {
      // Ensure at least one of specUrl or specJson is provided
      if (!specUrl && !specJson) {
        throw new Error('Either specUrl or specJson must be provided');
      }
      
      // Fetch the OpenAPI spec if a URL is provided
      let specData;
      if (specUrl) {
        const response = await ApiService.callApi({
          endpoint: specUrl,
          method: 'GET'
        });
        
        if (!response.success) {
          throw new Error(`Failed to fetch OpenAPI spec: ${response.error}`);
        }
        
        specData = response.data;
      } else if (specJson) {
        try {
          specData = JSON.parse(specJson);
        } catch (err) {
          throw new Error('Invalid JSON provided for specJson');
        }
      }
      
      // Process the OpenAPI spec to extract operations
      const operations = extractOperationsFromSpec(specData, operationId);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ operations }, null, 2)
        } as const]
      };
    } catch (error: any) {
      console.error('Error processing API operations:', error);
      return {
        content: [{
          type: 'text',
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
  if (spec && spec.paths) {
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
