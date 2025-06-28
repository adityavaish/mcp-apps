# Azure DevOps MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that connects to your Azure DevOps organization, exposing projects, repositories, and work items as resources and providing tools for working with Azure DevOps.

## Features

- **Connection to Azure DevOps**: Securely connects to your Azure DevOps environment using browser-based authentication.
- **Project Resources**: Exposes projects, repositories, and work items as resources for AI assistants to understand your Azure DevOps structure.
- **Work Item Tools**: Provides tools for querying and working with work items in your Azure DevOps projects.
- **Repository Tools**: Tools for interacting with your code repositories and pull requests.
- **Project Management Tools**: Tools for managing projects and teams in Azure DevOps.

## Setup Instructions

### Prerequisites

- VS Code (latest version recommended)
- Node.js 18.0 or higher
- npm 8.0 or higher
- Access to an Azure DevOps organization
- Proper authentication credentials for Azure DevOps

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

7. Type the following command to install and run the Azure DevOps MCP server:
   ```bash
   npx @mcp-apps/azure-devops-mcp-server
   ```

8. Follow the browser authentication prompts to connect to your Azure DevOps resources.

9. Once authenticated, Copilot will be able to assist with Azure DevOps tasks and queries.

## Available Tools

- `getProjects` - Lists all available projects in your Azure DevOps organization
- `getRepositories` - Gets repositories for a specified project
- `getWorkItems` - Queries work items based on filters and criteria
- `createWorkItem` - Creates a new work item in a project
- `getPullRequests` - Gets pull requests for a repository with filtering options

## Security Considerations

- This server only allows operations permitted by your Azure DevOps permissions
- Contains basic security measures to prevent destructive operations
- Uses Azure AD authentication for secure access
- Consider additional security measures depending on your specific requirements

## License

ISC