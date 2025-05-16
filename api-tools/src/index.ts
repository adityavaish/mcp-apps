#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { apiCallTool as simpleApiCallTool } from "./tools/simpleApiCall";
import { apiCallTool as advancedApiCallTool } from "./tools/api-call";
import { getApiOperationsTool } from "./tools/apiSpecTool";
import { generateApiCallTool } from "./tools/generateApiCallTool";

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

    // Register API-related tools - simple version (default)
    server.tool(
      simpleApiCallTool.name,
      simpleApiCallTool.description,
      simpleApiCallTool.parameters,
      simpleApiCallTool.handler
    );
    
    // Register advanced API tool with more authentication options
    server.tool(
      "call_api_advanced",
      advancedApiCallTool.description,
      advancedApiCallTool.parameters,
      advancedApiCallTool.handler
    );
    
    server.tool(
      getApiOperationsTool.name,
      getApiOperationsTool.description,
      getApiOperationsTool.parameters,
      getApiOperationsTool.handler
    );
    
    server.tool(
      generateApiCallTool.name,
      generateApiCallTool.description,
      generateApiCallTool.parameters,
      generateApiCallTool.handler
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