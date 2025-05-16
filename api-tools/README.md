# API Tools MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that provides tools for API integration and web service interaction.

## Features

- **API Integration**: Tools for making API calls to various services with authentication
- **OpenAPI Support**: Parse OpenAPI specifications and generate call templates
- **Authentication**: Multiple authentication methods including Bearer token and Basic auth
- **Request Generation**: Generate API requests based on specifications
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
    - `authType`: Authentication method ('bearer', 'basic', 'none')
    - `authConfig` (optional): Authentication configuration

- `call_api_advanced` - Extended version with more authentication options
  - Additional parameters:
    - `authType`: Includes 'msal' and 'azure-identity' options
    - `timeout`: Request timeout in milliseconds
    - `retryCount`: Number of retries for transient errors

- `get_api_operations` - Retrieves information about available operations from an OpenAPI specification
  - Parameters:
    - `specUrl`: URL to the OpenAPI specification document
    - `specJson`: Alternative to provide the spec directly as JSON
    - `operationId` (optional): Filter for a specific operation

- `generate_api_call` - Generates templates for API calls based on OpenAPI specifications
  - Parameters:
    - `specUrl`: URL to the OpenAPI specification document
    - `operationId`: The operation to generate a template for
    - `serverIndex` (optional): Index of the server to use from the spec

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
```
Get the available operations from the Petstore API specification at https://petstore.swagger.io/v2/swagger.json
```

### Generating an API Call Template
```
Generate a template for the 'addPet' operation from the Petstore API
```

### Advanced Authentication
```
Call the Microsoft Graph API with MSAL authentication to retrieve my profile information
```

## Security Considerations

- This server handles API keys and authentication tokens with appropriate security measures
- All sensitive data is properly handled and not logged or exposed
- Implements standard security practices for API communication
- Authentication token refresh is managed securely
- Consider additional security measures depending on your specific API integration requirements

## License

ISC