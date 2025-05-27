// filepath: c:\repos\mcp-apps\api-tools\docs\openapi-tools.md
# OpenAPI Tools Documentation

This document provides details on how to use the OpenAPI tools in the API Tools MCP Server.

## Overview

The API Tools MCP Server includes four tools for working with OpenAPI specifications:

1. `fetch_openapi_schema`: Fetches and parses an OpenAPI schema from a URL
2. `get_openapi_endpoints`: Lists all available endpoints from an OpenAPI schema
3. `get_openapi_operations`: Gets detailed information about operations for a specific endpoint
4. `get_openapi_operation_details`: Gets comprehensive details about a specific operation (by operationId) including generated sample requests

## Tool Details

### fetch_openapi_schema

This tool downloads and parses an OpenAPI schema from the provided URL, extracting key information such as API title, version, and available endpoints.

#### Parameters

- `schemaUrl` (required): URL where the OpenAPI schema is published
- `authType` (optional): Authentication method if the schema requires auth: 'bearer', 'basic', 'interactive', or 'none'
- `authConfig` (optional): Authentication configuration object (required if authType is not 'none')
  - `token`: Bearer token (required for authType='bearer')
  - `username`: Username (required for authType='basic')
  - `password`: Password (optional for authType='basic')
  - `clientId`: Client ID (required for authType='interactive')
  - `tenantId`: Tenant ID (optional for authType='interactive', defaults to 'common')

#### Example usage

```javascript
// Public Schema
fetch_openapi_schema({schemaUrl: "https://petstore.swagger.io/v2/swagger.json"})

// Protected Schema
fetch_openapi_schema({
  schemaUrl: "https://api.example.com/swagger.json",
  authType: "bearer",
  authConfig: {token: "your-token-here"}
})
```

### get_openapi_endpoints

This tool extracts and returns all paths/endpoints defined in an OpenAPI schema, grouped by path with their associated HTTP methods.

#### Parameters

- `schemaUrl` (required): URL where the OpenAPI schema is published
- `authType` (optional): Authentication method if the schema requires auth
- `authConfig` (optional): Authentication configuration object

#### Example usage

```javascript
get_openapi_endpoints({schemaUrl: "https://petstore.swagger.io/v2/swagger.json"})
```

### get_openapi_operations

This tool retrieves comprehensive details about all HTTP methods (operations) available for a specific endpoint path in an OpenAPI schema, including parameters, request bodies, responses and other metadata.

#### Parameters

- `schemaUrl` (required): URL where the OpenAPI schema is published
- `path` (required): The specific API path to get operations for (e.g., "/pets" or "/users/{id}")
- `authType` (optional): Authentication method if the schema requires auth
- `authConfig` (optional): Authentication configuration object

#### Example usage

```javascript
get_openapi_operations({
  schemaUrl: "https://petstore.swagger.io/v2/swagger.json",
  path: "/pet"
})
```

### get_openapi_operation_details

This tool retrieves comprehensive details about a specific API operation identified by its operationId, including parameters, request body schema, response schemas, and generates sample requests.

#### Parameters

- `schemaUrl` (required): URL where the OpenAPI schema is published
- `operationId` (required): The operation ID to retrieve details for (e.g., "getPetById", "createUser")
- `authType` (optional): Authentication method if the schema requires auth
- `authConfig` (optional): Authentication configuration object

#### Example usage

```javascript
get_openapi_operation_details({
  schemaUrl: "https://petstore.swagger.io/v2/swagger.json",
  operationId: "getPetById"
})
```

## Using with GitHub Copilot

When using these tools with GitHub Copilot, you can ask natural language questions like:

- "Fetch the OpenAPI schema from the Petstore API and show me the available endpoints"
- "What operations are available for the /pet endpoint in the Petstore API?"
- "Get detailed information about the POST operation for /pet in the OpenAPI schema"
- "Get the response schema for the getPetById operation from the Petstore API"
- "Generate a sample request for the createUser operation in the Petstore API"
- "Show me details for the getPetById operation including a sample request"

## Advanced Usage

### Authentication

When accessing protected OpenAPI schemas that require authentication, you can specify the authentication method and credentials:

```javascript
// Bearer token authentication
fetch_openapi_schema({
  schemaUrl: "https://api.example.com/swagger.json",
  authType: "bearer",
  authConfig: {token: "your-token-here"}
})

// Basic authentication
fetch_openapi_schema({
  schemaUrl: "https://api.example.com/swagger.json",
  authType: "basic",
  authConfig: {username: "user", password: "pass"}
})

// Interactive authentication (for Microsoft Identity services)
fetch_openapi_schema({
  schemaUrl: "https://management.azure.com/swagger.json",
  authType: "interactive",
  authConfig: {
    clientId: "your-client-id",
    scopes: ["https://management.azure.com/.default"]
  }
})
```
