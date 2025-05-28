# MCP Server Collection

This repository contains [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) servers that connect to various Azure services, exposing resources and providing tools for AI assistants.

## Available MCP Servers

### API Tools MCP Server

Provides powerful tools for API integration and web service interaction.

**Features:**
- API Integration with multiple authentication methods
- Support for REST API calls to various services
- Multiple authentication methods including Bearer token, Basic auth, and Interactive device code auth
- Comprehensive error handling with retries for transient failures
- OpenAPI schema discovery and integration

**Available Tools:**

- `call_api` - Makes authenticated API calls to a specified endpoint with various authentication options
  - Support for common HTTP methods (GET, POST, PUT, PATCH, DELETE)
  - Handles headers, query parameters, request body, and authentication configurations
- `fetch_openapi_schema` - Fetches and parses an OpenAPI schema from a URL with auto-discovery capabilities
- `get_openapi_endpoints` - Lists all available endpoints from an OpenAPI schema with their HTTP methods
- `get_openapi_operations` - Gets detailed information about operations for a specific endpoint path
- `get_openapi_operation_details` - Gets comprehensive details about a specific operation by its operationId

### Azure DevOps MCP Server

Connects to Azure DevOps, exposing projects, repositories, and work items as resources.

**Features:**

- Connection to Azure DevOps using browser-based authentication
- Project resources (projects, repositories, work items)
- Tools for querying and working with work items
- Tools for interacting with repositories and pull requests
- Project management tools

**Available Tools:**

- `getProjects` - Lists all available projects in your Azure DevOps organization
- `getRepositories` - Gets repositories for a specified project
- `getWorkItems` - Queries work items based on filters and criteria
- `createWorkItem` - Creates a new work item in a project
- `getPullRequests` - Gets pull requests for a repository with filtering options

### Kusto MCP Server

Connects to Azure Data Explorer (Kusto) database, exposing table schemas and providing data analysis tools.

**Features:**

- Connection to Kusto Database using service principal or managed identity authentication
- Schema resources (table schemas and sample data)
- KQL Query tools for running read-only queries
- Data analysis tools for common tasks
- Analysis prompts and templates

**Available Tools:**

- `executeQuery` - Executes a read-only KQL query against your database
- `getTableInfo` - Gets detailed schema and sample data for a specified table
- `findTables` - Finds tables that match a specified name pattern
- `analyzeData` - Performs various data analyses including summary statistics, time series analysis, top values analysis, outlier detection, and correlation analysis

### PDF Tools MCP Server

Provides PDF processing capabilities, enabling AI assistants to extract and manipulate PDF document content.

**Features:**

- Text extraction from PDF documents
- Form filling capabilities for PDF forms
- PDF form element discovery and manipulation
- Support for both local and remote PDF files

**Available Tools:**

- `extractText` - Extracts text content from PDF documents with page information
- `fillPdfForm` - Fills in form fields in PDF documents (text fields, checkboxes, radio buttons)
- `getPdfFormElements` - Identifies and lists all form elements in a PDF document
- `extractTables` - Extracts tabular data from PDF documents
- `getMetadata` - Retrieves document metadata from PDF files

## Setup Instructions

### Prerequisites

- VS Code (latest version recommended)
- Node.js 18.0 or higher
- npm 8.0 or higher
- Access to appropriate Azure services
- Proper authentication credentials

## Installation with GitHub Copilot UI

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

7. Type the appropriate command to install and run your desired MCP server:

   **For API Tools:**

   ```bash
   npx @mcp-apps/api-tools-mcp-server
   ```

   **For Azure DevOps:**

   ```bash
   npx @mcp-apps/azure-devops-mcp-server
   ```

   **For Kusto:**

   ```bash
   npx @mcp-apps/kusto-mcp-server
   ```

   **For PDF Tools:**

   ```bash
   npx @mcp-apps/pdf-tools-mcp-server
   ```

8. Follow the browser authentication prompts to connect to your Azure resources.

9. Once authenticated, Copilot will be able to assist with tasks specific to the connected service.

## Security Considerations

- These servers only allow operations permitted by your authentication permissions.
- Basic security measures prevent destructive operations.
- Authentication uses Azure AD for secure access.
- Consider additional security measures depending on your specific requirements.

## Contributing

We welcome contributions to the MCP Server Collection! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and best practices on how to contribute to this project.

## License

ISC
