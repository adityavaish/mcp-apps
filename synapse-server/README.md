# Synapse MCP Server

An MCP (Model Context Protocol) server for Azure Synapse Analytics, providing tools for:
- **Synapse Pipeline Management**: Start, stop, monitor pipeline runs

## Features

### Delta Table Operations
- `create_delta_table`: Create a new Delta table with a specified schema (properly formatted JSON Lines transaction log)

### Synapse Pipeline Operations
- `start_synapse_pipeline`: Start a pipeline run with optional parameters
- `get_pipeline_status`: Check the status of a running pipeline
- `cancel_synapse_pipeline`: Cancel a running pipeline
- `list_synapse_pipelines`: List all available pipelines

## Prerequisites

- Node.js 18 or higher
- Azure Synapse Analytics workspace
- Azure Storage Account with ADLS Gen2 enabled
- Azure authentication configured (via Azure CLI, Environment Variables, or Managed Identity)

## Installation

```bash
cd synapse-server
npm install
npm run build
```

## Configuration

Set the following environment variables:

```bash
# Required
SYNAPSE_WORKSPACE_URL=https://your-workspace.dev.azuresynapse.net
STORAGE_ACCOUNT_NAME=yourstorageaccount
FILE_SYSTEM_NAME=yourcontainer

# Optional (for custom server identification)
MCP_SERVER_NAME=synapse-mcp-server
MCP_SERVER_VERSION=1.0.0
```

### Authentication

This server uses `DefaultAzureCredential` which supports multiple authentication methods in order:
1. Environment variables (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)
2. Managed Identity (when running on Azure)
3. Azure CLI (az login)
4. Visual Studio Code
5. Azure PowerShell

For local development, the easiest method is to use Azure CLI:
```bash
az login
```

## Usage with VS Code MCP

Add to your `.vscode/mcp.json`:

```json
{
  "servers": {
    "synapse-server": {
      "type": "stdio",
      "command": "node",
      "args": [
        "c:\\path\\to\\mcp-apps\\synapse-server\\dist\\index.js"
      ],
      "env": {
        "SYNAPSE_WORKSPACE_URL": "https://your-workspace.dev.azuresynapse.net",
        "STORAGE_ACCOUNT_NAME": "yourstorageaccount",
        "FILE_SYSTEM_NAME": "yourcontainer"
      }
    }
  }
}
```

## Example Usage

### Create a Delta Table
```typescript
{
  "tool": "create_delta_table",
  "arguments": {
    "tablePath": "data/mypath/DeltaTables/my-table.delta",
    "columns": [
      { "name": "Version", "type": "long", "nullable": true },
      { "name": "Timestamp", "type": "timestamp", "nullable": true },
      { "name": "UserId", "type": "string", "nullable": true },
      { "name": "UserName", "type": "string", "nullable": true },
      { "name": "Operation", "type": "string", "nullable": true }
    ],
    "partitionColumns": [],
    "description": "Order history tracking table"
  }
}
```

### Start a Synapse Pipeline
```typescript
{
  "tool": "start_synapse_pipeline",
  "arguments": {
    "pipelineName": "DataProcessingPipeline",
    "parameters": {
      "sourceFolder": "input",
      "targetFolder": "output"
    }
  }
}
```

### Check Pipeline Status
```typescript
{
  "tool": "get_pipeline_status",
  "arguments": {
    "runId": "abc123-def456-ghi789"
  }
}
```

## IAM Permissions Required

### For ADLS Gen2 Operations:
- `Storage Blob Data Contributor` or `Storage Blob Data Owner` on the storage account

### For Synapse Pipeline Operations:
- `Synapse Contributor` or `Synapse Administrator` on the Synapse workspace

## Development

```bash
# Build
npm run build

# Watch mode
npm run watch

# Debug with MCP Inspector
npm run debug

# Clean build artifacts
npm run clean

# Rebuild from scratch
npm run rebuild
```

## Troubleshooting

### Authentication Issues
- Ensure you're logged in via Azure CLI: `az login`
- Check that your account has the required permissions
- Verify environment variables are set correctly

### Connection Issues
- Verify the Synapse workspace URL is correct (should end with .dev.azuresynapse.net)
- Check storage account name and file system (container) name
- Ensure firewall rules allow your IP address

## License

MIT