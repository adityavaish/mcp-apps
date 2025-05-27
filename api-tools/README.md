# API Tools MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that provides tools for API integration and web service interaction.

## Features

- **API Integration**: Tools for making API calls to various services with authentication
- **OpenAPI Support**: Parse and inspect OpenAPI specifications
- **Authentication**: Multiple authentication methods including Bearer token, Basic auth, and Interactive authentication
- **Request Generation**: Generate API requests based on specifications
- **Schema Inspection**: Fetch OpenAPI schemas, list endpoints, and explore API operations
- **Error Handling**: Comprehensive error handling with retries for transient failures

## Setup Instructions

### Prerequisites

- VS Code (latest version recommended)
- Node.js 18.0 or higher
- npm 8.0 or higher

### Local Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/your-repo/api-tools-mcp-server.git
   cd api-tools-mcp-server
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the project:

   ```bash
   npm run build
   ```

4. Run the server:

   ```bash
   npm start
   ```

5. For development with auto-reload:

   ```bash
   npm run watch
   ```

6. To run tests:

   ```bash
   npm run test:api
   npm run test:openapi
   ```

## Using with GitHub Copilot in VS Code

### Installation with GitHub Copilot UI

1. Ensure you have the GitHub Copilot extension installed in VS Code

- If not, open VS Code Extensions view (Ctrl+Shift+X)
- Search for "GitHub Copilot"
- Click "Install"

2. Open VS Code and the GitHub Copilot Chat panel

- Use the keyboard shortcut (Ctrl+Shift+I) or
- Click on the Copilot Chat icon in the activity bar

3. Select "Agent Mode" in the Copilot Chat panel.

4. Click on the "Tools" icon and select **Add More Tools**.

5. Click **Add MCP Server** tool.

6. Choose **Command (stdio)** as the tool type.

7. Type the following command to install and run the API Tools MCP server:

  ```bash
  npx @mcp-apps/api-tools-mcp-server
  ```

8. Once set up, Copilot will be able to assist with API integration and calls.

## Available Tools

### API Integration Tools

- `call_api` - Makes authenticated API calls to a specified endpoint
  - Parameters:
    - `endpoint`: The base URL of the API endpoint
    - `method`: HTTP method (GET, POST, PUT, PATCH, DELETE)
    - `path` (optional): Path to append to the endpoint URL
    - `queryParams` (optional): Query parameters to include
    - `headers` (optional): Headers to include
    - `body` (optional): Body data to include in the request
    - `authType`: Authentication method ('bearer', 'basic', 'interactive', 'none')
    - `authConfig` (optional): Authentication configuration

- `call_api_advanced` - Extended version with more authentication options
  - Additional parameters:
    - `authType`: Includes 'msal' and 'azure-identity' options
    - `timeout`: Request timeout in milliseconds
    - `retryCount`: Number of retries for transient errors

- `fetch_openapi_schema` - Fetches and parses an OpenAPI schema from a URL
  - Parameters:
    - `schemaUrl`: URL where the OpenAPI schema is published
    - `authType` (optional): Authentication method if the schema requires auth
    - `authConfig` (optional): Authentication configuration object

- `get_openapi_endpoints` - Lists all available endpoints from an OpenAPI schema
  - Parameters:
    - `schemaUrl`: URL where the OpenAPI schema is published
    - `authType` (optional): Authentication method if the schema requires auth
    - `authConfig` (optional): Authentication configuration object

- `get_openapi_operations` - Gets detailed information about operations for a specific endpoint
  - Parameters:
    - `schemaUrl`: URL where the OpenAPI schema is published
    - `path`: The specific API path to get operations for (e.g., "/pets")
    - `authType` (optional): Authentication method if the schema requires auth
    - `authConfig` (optional): Authentication configuration object

- `get_openapi_operation_details` - Gets comprehensive details about a specific operation (by operationId)
  - Parameters:
    - `schemaUrl`: URL where the OpenAPI schema is published
    - `operationId`: The operation ID to retrieve details for (e.g., "getPetById")
    - `authType` (optional): Authentication method if the schema requires auth
    - `authConfig` (optional): Authentication configuration object

## Example Usage

Here are examples of using the API Tools MCP Server with GitHub Copilot:

### Making a Simple API Call

```
Call the Weather API at https://api.weather.com/forecast with my API key abc123
```

### Making an Authenticated API Call

```
Make a POST request to https://api.example.com/data with bearer token authentication
```

### Working with OpenAPI Specifications

```text
Get the available operations from the Petstore API specification at https://petstore.swagger.io/v2/swagger.json
```

### Fetching an OpenAPI Schema

```text
Fetch the complete OpenAPI schema from https://petstore.swagger.io/v2/swagger.json
```

### Listing OpenAPI Endpoints

```text
List all the endpoints available in the Petstore API at https://petstore.swagger.io/v2/swagger.json
```

### Getting Endpoint Operations

```text
Show me all the operations available for the /pet endpoint in the Petstore API
```

### Getting Operation Details by ID

```text
Get details for the getPetById operation in the Petstore API and show me a sample request
```

### Generating an API Call Template

```text
Generate a template for the 'addPet' operation from the Petstore API
```

### Advanced Authentication

```
Call the Microsoft Graph API with MSAL authentication to retrieve my profile information
```

### Interactive Browser Authentication

```
Log me in using device code authentication to call the Microsoft Graph API
```

## Security Considerations

- This server handles API keys and authentication tokens with appropriate security measures
- All sensitive data is properly handled and not logged or exposed
- Implements standard security practices for API communication
- Authentication token refresh is managed securely
- Consider additional security measures depending on your specific API integration requirements

## License

ISC
