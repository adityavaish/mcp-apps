#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { apiCallTool } from "./tools/api-call";

async function main() {
  try {
    const server = new McpServer({
      name: process.env.MCP_SERVER_NAME || "api-tools-mcp-server",
      description: "API Tools MCP Server for API integration",
      version: process.env.MCP_SERVER_VERSION || "1.0.0",
      capabilities: {
        resources: {},
        tools: {},
      },
    });

    server.tool(
      apiCallTool.name,
      apiCallTool.description,
      apiCallTool.parameters,
      apiCallTool.handler
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("API Tools MCP Server running on stdio");
  }
  catch (error: any) {
    console.error("Error starting MCP server:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

main();