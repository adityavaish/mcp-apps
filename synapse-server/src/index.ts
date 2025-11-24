#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { startPipelineTool, getPipelineStatusTool, cancelPipelineTool, listPipelinesTool } from "./tools/pipeline-tools.js";
import { createDeltaTableTool } from "./tools/delta-table-tools.js";

async function main() {
  try {
    const server = new McpServer({
      name: process.env.MCP_SERVER_NAME || "synapse-mcp-server",
      description: "Azure Synapse MCP Server for ADLS Gen2 and pipeline operations",
      version: process.env.MCP_SERVER_VERSION || "1.0.0",
      capabilities: {
        resources: {},
        tools: {},
      },
    });

    // Synapse Pipeline Tools
    server.tool(
      startPipelineTool.name,
      startPipelineTool.description,
      startPipelineTool.parameters,
      startPipelineTool.handler
    );

    server.tool(
      getPipelineStatusTool.name,
      getPipelineStatusTool.description,
      getPipelineStatusTool.parameters,
      getPipelineStatusTool.handler
    );

    server.tool(
      cancelPipelineTool.name,
      cancelPipelineTool.description,
      cancelPipelineTool.parameters,
      cancelPipelineTool.handler
    );

    server.tool(
      listPipelinesTool.name,
      listPipelinesTool.description,
      listPipelinesTool.parameters,
      listPipelinesTool.handler
    );

    // Delta Table Tools
    server.tool(
      createDeltaTableTool.name,
      createDeltaTableTool.description,
      createDeltaTableTool.parameters,
      createDeltaTableTool.handler
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Synapse MCP Server running on stdio");
  }
  catch (error: any) {
    console.error("Error starting MCP server:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

main();