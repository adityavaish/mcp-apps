# Advanced API Integration

This document provides details about the advanced API integration capabilities in the API Tools MCP Server.

## Overview

In addition to the standard API integration features, the API Tools MCP Server provides an advanced API call tool with the following enhancements:

1. **Extended Authentication Methods**: Support for MSAL and Azure Identity
2. **Automatic Retry Logic**: Exponential backoff with jitter for transient errors
3. **Enhanced Error Handling**: Detailed error information and better type safety
4. **Improved Timeout Management**: Configurable request timeouts
5. **Token Caching**: Efficient token reuse for authenticated APIs

## Authentication Methods

The advanced API tool supports the following authentication methods:

### MSAL Authentication

```json
{
  "endpoint": "https://graph.microsoft.com/v1.0",
  "method": "GET",
  "path": "me",
  "authType": "msal",
  "authConfig": {
    "clientId": "your-client-id",
    "tenantId": "your-tenant-id",
    "scopes": ["https://graph.microsoft.com/.default"]
  }
}
```

### Azure Identity Authentication

```json
{
  "endpoint": "https://management.azure.com",
  "method": "GET",
  "path": "subscriptions",
  "authType": "azure-identity", 
  "authConfig": {
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "tenantId": "your-tenant-id",
    "scopes": ["https://management.azure.com/.default"]
  }
}
```

### Managed Identity Authentication

```json
{
  "endpoint": "https://management.azure.com",
  "method": "GET",
  "path": "subscriptions",
  "authType": "azure-identity", 
  "authConfig": {
    "managedIdentityClientId": "your-managed-identity-client-id",
    "scopes": ["https://management.azure.com/.default"]
  }
}
```

## Advanced Features

### Retry Logic

The advanced API tool includes built-in retry logic for transient errors:

- Network failures
- Timeouts
- Server errors (502, 503, 504)

You can configure the number of retries with the `retryCount` parameter:

```json
{
  "endpoint": "https://api.example.com",
  "method": "GET",
  "path": "data",
  "authType": "none",
  "retryCount": 5,
  "timeout": 10000
}
```

### Timeout Management

Specify request timeouts to prevent long-running operations:

```json
{
  "endpoint": "https://api.example.com",
  "method": "GET",
  "path": "data",
  "authType": "none",
  "timeout": 30000  // 30 seconds
}
```

## Example Use Cases

### Using with Microsoft Graph API

```json
{
  "endpoint": "https://graph.microsoft.com/v1.0",
  "method": "GET",
  "path": "me",
  "authType": "msal",
  "authConfig": {
    "clientId": "your-client-id",
    "tenantId": "your-tenant-id",
    "scopes": ["https://graph.microsoft.com/.default"]
  }
}
```

### Using with Azure Management API

```json
{
  "endpoint": "https://management.azure.com",
  "method": "GET",
  "path": "subscriptions",
  "authType": "azure-identity",
  "authConfig": {
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "tenantId": "your-tenant-id",
    "scopes": ["https://management.azure.com/.default"]
  }
}
```

## Security Best Practices

1. **Use Environment Variables**: Store sensitive credentials in environment variables rather than hardcoding them
2. **Limit Scopes**: Request only the scopes that your application needs
3. **Token Management**: Use the built-in token caching mechanisms
4. **Error Handling**: Check response status and handle authentication errors appropriately
