# MCP Server Collection

This repository contains [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) servers that connect to various Azure services, exposing resources and providing tools for AI assistants.

## Available MCP Servers

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

## License

ISC
