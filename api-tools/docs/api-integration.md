# API Integration with MCP Server

This document provides details about the API integration features of the API Tools MCP Server.

## Overview

The API Tools MCP Server provides several tools for working with APIs:

1. **call_api**: Make authenticated API calls to any endpoint
2. **get_api_operations**: Parse OpenAPI specifications to discover available operations
3. **generate_api_call**: Generate API call templates based on OpenAPI specifications

## Authentication Methods

The server supports the following authentication methods:

### Bearer Token Authentication

```json
{
  "endpoint": "https://api.example.com",
  "method": "GET",
  "path": "users/me",
  "authType": "bearer",
  "authConfig": {
    "token": "your-token-here"
  }
}
```

### Basic Authentication

```json
{
  "endpoint": "https://api.example.com",
  "method": "GET",
  "path": "protected-resource",
  "authType": "basic", 
  "authConfig": {
    "username": "your-username",
    "password": "your-password"
  }
}
```

## Working with OpenAPI Specifications

The API Tools MCP Server can also work with OpenAPI specifications:

### Retrieving API Operations

To get a list of available operations from an OpenAPI specification:

```json
{
  "specUrl": "https://petstore3.swagger.io/api/v3/openapi.json"
}
```

This will return detailed information about all operations available in the API, including:

- Endpoint paths
- HTTP methods
- Operation IDs
- Parameters
- Request bodies
- Response schemas

### Generating API Call Templates

To generate a template for a specific API call based on an operation ID:

```json
{
  "specUrl": "https://petstore3.swagger.io/api/v3/openapi.json",
  "operationId": "getPetById"
}
```

This will return a template that you can use with the call_api tool, populated with:

- The server URL
- The correct path
- Placeholders for required parameters
- Content-Type headers
- A sample request body (if applicable)

## Example Use Cases

### Working with Microsoft Graph API

```json
{
  "endpoint": "https://graph.microsoft.com/v1.0",
  "method": "GET",
  "path": "me",
  "authType": "bearer",
  "authConfig": {
    "token": "your-graph-access-token"
  }
}
```

### Working with GitHub API

```json
{
  "endpoint": "https://api.github.com",
  "method": "GET",
  "path": "user/repos",
  "authType": "bearer",
  "authConfig": {
    "token": "your-github-personal-access-token"
  }
}
```

### Working with RESTful APIs

```json
{
  "endpoint": "https://jsonplaceholder.typicode.com",
  "method": "POST",
  "path": "posts",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "title": "Sample Post",
    "body": "This is a sample post body",
    "userId": 1
  }
}
```
