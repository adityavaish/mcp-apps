#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Import tools
import { listWorkItemsTool, createWorkItemTool, updateWorkItemTool } from "./tools/work-items";
import { listRepositoriesTool, listPullRequestsTool, getRepositoryFileTool, createPullRequestTool } from "./tools/repositories";
import { listProjectsTool } from "./tools/projects";
import { 
    gitCommandTool, 
    cloneRepositoryTool, 
    createBranchTool, 
    pushChangesTool, 
    getRepositoryStatusTool,
    commitChangesTool
} from "./tools/git-commands";

// FOR TESTING ONLY: Uncomment the following lines to use a specific access token
// import { getAccessToken } from "./utils/token-manager";
// const accessToken = getAccessToken();

// Create server instance
const server = new McpServer({
    name: "azure-devops-mcp-server",
    description: "Azure DevOps MCP Server",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

// Register tools
server.tool(
    listWorkItemsTool.name,
    listWorkItemsTool.description,
    listWorkItemsTool.parameters,
    listWorkItemsTool.handler
);

server.tool(
    createWorkItemTool.name,
    createWorkItemTool.description,
    createWorkItemTool.parameters,
    createWorkItemTool.handler
);

server.tool(
    updateWorkItemTool.name,
    updateWorkItemTool.description,
    updateWorkItemTool.parameters,
    updateWorkItemTool.handler
);

server.tool(
    listRepositoriesTool.name,
    listRepositoriesTool.description,
    listRepositoriesTool.parameters,
    listRepositoriesTool.handler
);

server.tool(
    listPullRequestsTool.name,
    listPullRequestsTool.description,
    listPullRequestsTool.parameters,
    listPullRequestsTool.handler
);

server.tool(
    getRepositoryFileTool.name,
    getRepositoryFileTool.description,
    getRepositoryFileTool.parameters,
    getRepositoryFileTool.handler
);

server.tool(
    listProjectsTool.name,
    listProjectsTool.description,
    listProjectsTool.parameters,
    listProjectsTool.handler
);

server.tool(
    createPullRequestTool.name,
    createPullRequestTool.description,
    createPullRequestTool.parameters,
    createPullRequestTool.handler
);

// Register Git commands tools
server.tool(
    gitCommandTool.name,
    gitCommandTool.description,
    gitCommandTool.parameters,
    gitCommandTool.handler
);

server.tool(
    cloneRepositoryTool.name,
    cloneRepositoryTool.description,
    cloneRepositoryTool.parameters,
    cloneRepositoryTool.handler
);

server.tool(
    createBranchTool.name,
    createBranchTool.description,
    createBranchTool.parameters,
    createBranchTool.handler
);

server.tool(
    pushChangesTool.name,
    pushChangesTool.description,
    pushChangesTool.parameters,
    pushChangesTool.handler
);

server.tool(
    getRepositoryStatusTool.name,
    getRepositoryStatusTool.description,
    getRepositoryStatusTool.parameters,
    getRepositoryStatusTool.handler
);

server.tool(
    commitChangesTool.name,
    commitChangesTool.description,
    commitChangesTool.parameters,
    commitChangesTool.handler
);

// Start the server
async function main() {
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Azure DevOps MCP Server running on stdio");
    } catch (error) {
        console.error("Error starting server:", error);
        process.exit(1);
    }
}

main();
