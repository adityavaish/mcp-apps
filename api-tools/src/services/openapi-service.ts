import SwaggerParser from '@apidevtools/swagger-parser';
import { ApiService } from './api-service';

interface OpenApiOperation {
    operationId?: string;
    summary?: string;
    description?: string;
    parameters?: any[];
    requestBody?: any;
    responses?: Record<string, any>;
    tags?: string[];
    method: string;
}

interface OpenApiEndpoint {
    path: string;
    operations: OpenApiOperation[];
}

interface ParsedSchema {
    info: {
        title?: string;
        version?: string;
        description?: string;
    };
    endpoints: OpenApiEndpoint[];
    definitions?: any;
    basePath?: string;
    host?: string;
}

export class OpenApiService {
    private static cache: Record<string, ParsedSchema> = {};

    static async fetchSchema(url: string, authType?: 'bearer' | 'basic' | 'interactive' | 'none', authConfig?: any): Promise<ParsedSchema> {
        // Check cache first
        if (this.cache[url]) {
            return this.cache[url];
        }

        try {
            // Fetch the schema from the URL
            const response = await ApiService.callApi({
                endpoint: url,
                method: 'GET',
                authType,
                authConfig
            });

            if (!response.success) {
                throw new Error(`Failed to fetch OpenAPI schema: ${response.error}`);
            } 
            
            const schema = response.data; 
            
            try {
                // Parse the schema - use dereference instead of validate to better handle circular references
                const parsedSchema = await SwaggerParser.dereference(schema);
                return await this.parseSchema(parsedSchema);
            } catch (parseError: any) {
                // Fall back to a more lenient parse if circular references are causing issues
                console.warn('Warning: Using bundled parsing due to possible circular references:', parseError.message);
                const bundled = await SwaggerParser.bundle(schema);
                return await this.parseSchema(bundled);
            }
        } catch (error: any) {
            console.error('Error fetching OpenAPI schema:', error);
            throw new Error(`Failed to fetch or parse OpenAPI schema: ${error.message}`);
        }
    }

    /**
     * Gets all endpoints from an OpenAPI schema
     */
    static async getEndpoints(url: string, authType?: 'bearer' | 'basic' | 'interactive' | 'none', authConfig?: any): Promise<OpenApiEndpoint[]> {
        const schema = await this.fetchSchema(url, authType, authConfig);
        return schema.endpoints;
    }

    /**
     * Gets detailed information about operations for a specific endpoint
     */
    static async getOperations(url: string, path: string, authType?: 'bearer' | 'basic' | 'interactive' | 'none', authConfig?: any): Promise<OpenApiOperation[]> {
        const schema = await this.fetchSchema(url, authType, authConfig);

        const endpoint = schema.endpoints.find(e => e.path === path);
        if (!endpoint) {
            throw new Error(`Endpoint not found: ${path}`);
        }

        return endpoint.operations;
    }

    /**
     * Parses an OpenAPI schema into a standardized format
     */
    private static async parseSchema(schema: any): Promise<ParsedSchema> {
        const parsedSchema: ParsedSchema = {
            info: {
                title: schema.info?.title,
                version: schema.info?.version,
                description: schema.info?.description
            },
            endpoints: [],
            definitions: schema.definitions || schema.components?.schemas,
            basePath: schema.basePath,
            host: schema.host
        };

        // Parse paths/endpoints
        const paths = schema.paths || {};

        for (const path in paths) {
            const pathItem = paths[path];
            const operations: OpenApiOperation[] = [];

            // HTTP methods (get, post, put, delete, etc.)
            const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

            for (const method of httpMethods) {
                if (pathItem[method]) {
                    const operation = pathItem[method];
                    operations.push({
                        operationId: operation.operationId,
                        summary: operation.summary,
                        description: operation.description,
                        parameters: operation.parameters,
                        requestBody: operation.requestBody,
                        responses: operation.responses,
                        tags: operation.tags,
                        method: method.toUpperCase()
                    });
                }
            }

            if (operations.length > 0) {
                parsedSchema.endpoints.push({
                    path,
                    operations
                });
            }
        }

        // Cache the parsed schema
        this.cache[schema.info?.title || 'schema'] = parsedSchema;

        return parsedSchema;
    }
}
