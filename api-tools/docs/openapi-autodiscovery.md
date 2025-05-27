# OpenAPI Schema Auto-Discovery

The OpenAPI auto-discovery feature allows the API tools to locate a valid OpenAPI schema when only provided with a base URL. This is particularly useful when you don't know the exact path to the schema file.

## How It Works

When a base URL is provided, the OpenAPI service will:

1. First try to retrieve a schema directly from the provided URL
2. If that fails, the auto-discovery mechanism kicks in and tries to find the schema at common endpoint paths
3. For directory-like URLs, it will also check the parent directory for schemas
4. Once a valid schema is found, it is parsed, cached, and returned

## Supported Schema Paths

The auto-discovery feature tries the following common paths:

- `/v2/swagger.json` (common for Swagger Petstore and similar APIs)
- `/swagger.json`
- `/api-docs.json`
- `/openapi.json`
- `/swagger/v1/swagger.json`
- `/api/swagger.json`
- `/v1/api-docs`
- `/v2/api-docs`
- `/swagger`
- `/swagger/docs/v1`
- `/openapi`
- `/api/openapi.json`
- `/api-docs`
- `/docs/api.json`
- `/docs/openapi.json`
- `/api/v1/swagger.json`
- `/api/v1/openapi.json`

## Usage Example

```typescript
// You can provide just a base URL
const schema = await OpenApiService.fetchSchema('https://api.example.com');

// Or a more specific URL if you know it
const schema = await OpenApiService.fetchSchema('https://api.example.com/v2/swagger.json');

// The service will try to find the schema in either case
```

## Parent Path Checking

For URLs that look like directories (not ending with `.json` or other file extensions), the service will also check the parent path. For example, if you provide:

```
https://api.example.com/v2
```

The service will check both:
- `https://api.example.com/v2/[common-paths]`
- `https://api.example.com/[common-paths]`

This helps to discover schemas when the path structure isn't entirely known.

## Caching

Successfully discovered schemas are cached for 1 hour by default to improve performance for future requests to the same API.
