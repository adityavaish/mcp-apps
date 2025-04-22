# Kusto MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that connects to your Azure Data Explorer (Kusto) database, exposing table schemas as resources and providing tools for data analysis.

## Features

- **Connection to Kusto Database**: Securely connects to your Azure Data Explorer environment using service principal or managed identity authentication.
- **Schema Resources**: Exposes table schemas and sample data as resources for AI assistants to understand your data structure.
- **KQL Query Tools**: Provides tools for running read-only KQL queries against your database.
- **Data Analysis Tools**: Pre-built tools for common data analysis tasks like time series analysis, anomaly detection, etc.
- **Analysis Prompts**: Includes prompt templates for guiding AI assistants in performing common data analysis tasks.

## Setup Instructions

### Prerequisites

- VS Code (latest version recommended)
- Node.js 18.0 or higher
- npm 8.0 or higher
- Access to an Azure Data Explorer (Kusto) database
- Proper authentication credentials (service principal or managed identity)

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

7. Type the following command to install and run the Kusto MCP server:
  ```bash
  npx @mcp-apps/kusto-mcp-server
  ```

8. Follow the browser authentication prompts to connect to your Azure Data Explorer resources.

9. Once authenticated, Copilot will be able to assist with KQL queries and data analysis against your Kusto database.

## Available Tools

- `executeQuery` - Executes a read-only KQL query against your database
- `getTableInfo` - Gets detailed schema and sample data for a specified table
- `findTables` - Finds tables that match a specified name pattern
- `analyzeData` - Performs various data analyses including summary statistics, time series analysis, top values analysis, outlier detection, and correlation analysis

## Security Considerations

- This server only allows read-only operations to protect your data
- Contains basic security measures to prevent destructive operations
- Uses Azure AD authentication for secure database access
- Consider additional security measures depending on your specific requirements

## License

ISC