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
    private static cache: Record<string, {schema: ParsedSchema, timestamp: number}> = {};
    private static CACHE_TTL_MS = 3600000; // 1 hour cache TTL
    
    // Default popular OpenAPI schema URLs to try if the provided URL doesn't contain schema
    private static defaultSchemaEndpoints = [
        '/swagger.json',
        '/api-docs.json',
        '/openapi.json',
        '/swagger/v1/swagger.json',
        '/api/swagger.json',
        '/v1/api-docs',
        '/v2/api-docs',
        '/swagger',
        '/swagger/docs/v1',
        '/openapi',
        '/api/openapi.json',
        '/api-docs',
        '/docs/api.json',
        '/docs/openapi.json',
        '/api/v1/swagger.json',
        '/api/v1/openapi.json'
    ];

    /**
     * Checks if an object is a valid OpenAPI schema
     */
    private static isValidOpenApiSchema(obj: any): boolean {
        // Must be an object
        if (!obj || typeof obj !== 'object') return false;
        
        // OpenAPI 3.x has an "openapi" property
        if (obj.openapi && typeof obj.openapi === 'string' && obj.paths && typeof obj.paths === 'object') {
            return true;
        }
        
        // Swagger 2.x has a "swagger" property
        if (obj.swagger && typeof obj.swagger === 'string' && obj.paths && typeof obj.paths === 'object') {
            return true;
        }
        
        // Check for essential parts that should exist in both versions
        if (obj.info && typeof obj.info === 'object' && obj.paths && typeof obj.paths === 'object') {
            return true;
        }
        
        return false;
    }
    
    /**
     * Try to find a valid schema by appending common schema paths to the base URL
     */
    private static async tryDefaultSchemaEndpoints(baseUrl: string, authType?: 'bearer' | 'basic' | 'interactive' | 'none', authConfig?: any): Promise<ParsedSchema> {
        // Remove trailing slash if present
        const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        
        const attemptedUrls: string[] = [];
        const errors: Record<string, string> = {};
        
        // Try each common schema endpoint path
        for (const endpoint of this.defaultSchemaEndpoints) {
            try {
                const schemaUrl = `${normalizedBaseUrl}${endpoint}`;
                console.log(`Auto-discovery: Trying schema URL: ${schemaUrl}`);
                attemptedUrls.push(schemaUrl);
                
                const response = await ApiService.callApi({
                    endpoint: schemaUrl,
                    method: 'GET',
                    authType,
                    authConfig
                });
                
                if (response.success) {
                    if (this.isValidOpenApiSchema(response.data)) {
                        console.log(`Auto-discovery: Valid OpenAPI schema found at: ${schemaUrl}`);
                        
                        try {
                            const parsedSchema = await SwaggerParser.dereference(response.data);
                            return await this.parseSchema(parsedSchema);
                        } catch (parseError: any) {
                            console.log(`Auto-discovery: Using bundled parsing due to possible circular references at ${schemaUrl}: ${parseError.message}`);
                            // Fall back to bundled parsing
                            const bundled = await SwaggerParser.bundle(response.data);
                            return await this.parseSchema(bundled);
                        }
                    } else {
                        errors[schemaUrl] = 'Response received but not a valid OpenAPI schema';
                    }
                } else {
                    errors[schemaUrl] = `HTTP ${response.status}: ${response.error || 'Unknown error'}`;
                }
            } catch (error: any) {
                // Log error but continue trying other endpoints
                errors[`${normalizedBaseUrl}${endpoint}`] = error.message || 'Unknown error';
                continue;
            }
        }
        
        // If we get here, no valid schema was found at any of the default locations
        console.error('Auto-discovery failed. Attempted URLs:', attemptedUrls);
        console.error('Auto-discovery errors:', JSON.stringify(errors, null, 2));
        
        // Build a more helpful error message
        let errorMsg = `No valid OpenAPI schema found at ${baseUrl} or at any standard schema paths.`;
        errorMsg += `\nTried the following paths: ${attemptedUrls.map(url => url.replace(normalizedBaseUrl, '')).join(', ')}`;
        throw new Error(errorMsg);
    }

    static async fetchSchema(url: string, authType?: 'bearer' | 'basic' | 'interactive' | 'none', authConfig?: any): Promise<ParsedSchema> {
        // Check cache first
        if (this.cache[url] && (Date.now() - this.cache[url].timestamp < this.CACHE_TTL_MS)) {
            console.log(`Using cached OpenAPI schema for ${url}`);
            return this.cache[url].schema;
        }
        
        // Try to fetch and validate the schema from the primary URL
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
            
            // Verify this is actually an OpenAPI schema by checking for required properties
            if (this.isValidOpenApiSchema(schema)) {
                try {
                    // Parse the schema - use dereference instead of validate to better handle circular references
                    console.log(`Valid OpenAPI schema found at ${url}`);
                    const parsedSchema = await SwaggerParser.dereference(schema);
                    const result = await this.parseSchema(parsedSchema);
                    
                    // Store in cache with URL as key for direct access next time
                    this.cache[url] = {
                        schema: result,
                        timestamp: Date.now()
                    };
                    
                    return result;
                } catch (parseError: any) {
                    // Fall back to a more lenient parse if circular references are causing issues
                    console.warn('Warning: Using bundled parsing due to possible circular references:', parseError.message);
                    const bundled = await SwaggerParser.bundle(schema);
                    const result = await this.parseSchema(bundled);
                    
                    // Store in cache
                    this.cache[url] = {
                        schema: result,
                        timestamp: Date.now()
                    };
                    
                    return result;
                }
            } else {
                // This URL doesn't contain a valid schema, try default endpoints
                console.log(`URL ${url} doesn't contain a valid OpenAPI schema, trying auto-discovery`);
                const result = await this.tryDefaultSchemaEndpoints(url, authType, authConfig);
                
                // Store the result in cache with the original URL as key
                this.cache[url] = {
                    schema: result,
                    timestamp: Date.now()
                };
                
                return result;
            }
        } catch (error: any) {
            // If the direct fetch fails, try the default endpoints before giving up
            try {
                console.log(`Failed to fetch from ${url} directly, trying auto-discovery instead`);
                const result = await this.tryDefaultSchemaEndpoints(url, authType, authConfig);
                
                // Store the result in cache with the original URL as key
                this.cache[url] = {
                    schema: result,
                    timestamp: Date.now()
                };
                
                return result;
            } catch (fallbackError: any) {
                console.error('Error fetching OpenAPI schema:', error);
                throw new Error(`Failed to fetch or parse OpenAPI schema: ${error.message || 'Unknown error'}`);
            }
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

        // Store in cache with title as key
        const cacheKey = schema.info?.title || 'schema';
        this.cache[cacheKey] = {
            schema: parsedSchema,
            timestamp: Date.now()
        };

        return parsedSchema;
    }
}
