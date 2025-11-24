#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Import tools
import { listWorkItemsTool } from "./tools/list-work-items";
import { createWorkItemTool } from "./tools/create-work-item";
import { updateWorkItemTool } from "./tools/update-work-item";
import { listRepositoriesTool } from "./tools/git-list-repositories";
import { listPullRequestsTool } from "./tools/git-list-pull-requests";
import { getRepositoryFileTool } from "./tools/git-get-repository-file";
import { createPullRequestTool } from "./tools/git-create-pull-request";
import { listProjectsTool } from "./tools/projects";
import { gitCommandTool } from "./tools/git-command";
import { cloneRepositoryTool } from "./tools/git-clone-repository";
import { createBranchTool } from "./tools/git-create-branch";
import { pushChangesTool } from "./tools/git-push-changes";
import { getRepositoryStatusTool } from "./tools/git-get-repository-status";
import { commitChangesTool } from "./tools/git-commit-changes";
import {
    listBuildPipelinesTool,
    getBuildPipelineDetailsTool,
    listBuildRunsTool,
    listReleasePipelinesTool,
    getReleasePipelineDetailsTool,
    listReleaseRunsTool
} from "./tools/pipelines";
import {
    queryTestCasesTool,
    getTestCaseDetailsTool,
    createTestCaseTool
} from "./tools/test-cases.js";

// Import new PR analysis tools
import { getPRBasicInfoTool } from "./tools/get-pr-basic-info";
import { getPRCodeDiffsTool } from "./tools/get-pr-code-diffs";
import { getPRDetailedChangesTool } from "./tools/get-pr-detailed-changes";
import { getPRTestImpactTool } from "./tools/get-pr-test-impact";

import { getRepositoryContextTool } from "./tools/get-repository-context";

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

// Register pipeline tools
server.tool(
    listBuildPipelinesTool.name,
    listBuildPipelinesTool.description,
    listBuildPipelinesTool.parameters,
    listBuildPipelinesTool.handler
);

server.tool(
    getBuildPipelineDetailsTool.name,
    getBuildPipelineDetailsTool.description,
    getBuildPipelineDetailsTool.parameters,
    getBuildPipelineDetailsTool.handler
);

server.tool(
    listBuildRunsTool.name,
    listBuildRunsTool.description,
    listBuildRunsTool.parameters,
    listBuildRunsTool.handler
);

server.tool(
    listReleasePipelinesTool.name,
    listReleasePipelinesTool.description,
    listReleasePipelinesTool.parameters,
    listReleasePipelinesTool.handler
);

server.tool(
    getReleasePipelineDetailsTool.name,
    getReleasePipelineDetailsTool.description,
    getReleasePipelineDetailsTool.parameters,
    getReleasePipelineDetailsTool.handler
);

server.tool(
    listReleaseRunsTool.name,
    listReleaseRunsTool.description,
    listReleaseRunsTool.parameters,
    listReleaseRunsTool.handler
);

// Register test case tools
server.tool(
    queryTestCasesTool.name,
    queryTestCasesTool.description,
    queryTestCasesTool.parameters,
    queryTestCasesTool.handler
);

server.tool(
    getTestCaseDetailsTool.name,
    getTestCaseDetailsTool.description,
    getTestCaseDetailsTool.parameters,
    getTestCaseDetailsTool.handler
);

server.tool(
    createTestCaseTool.name,
    createTestCaseTool.description,
    createTestCaseTool.parameters,
    createTestCaseTool.handler
);

// Register PR analysis tools
server.tool(
    getPRBasicInfoTool.name,
    getPRBasicInfoTool.description,
    getPRBasicInfoTool.parameters,
    getPRBasicInfoTool.handler
);

server.tool(
    getPRCodeDiffsTool.name,
    getPRCodeDiffsTool.description,
    getPRCodeDiffsTool.parameters,
    getPRCodeDiffsTool.handler
);

server.tool(
    getPRDetailedChangesTool.name,
    getPRDetailedChangesTool.description,
    getPRDetailedChangesTool.parameters,
    getPRDetailedChangesTool.handler
);

server.tool(
    getPRTestImpactTool.name,
    getPRTestImpactTool.description,
    getPRTestImpactTool.parameters,
    getPRTestImpactTool.handler
);

server.tool(
    getRepositoryContextTool.name,
    getRepositoryContextTool.description,
    getRepositoryContextTool.parameters,
    getRepositoryContextTool.handler
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
