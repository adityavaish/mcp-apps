#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { apiCallTool } from "./tools/api-call";
import { fetchOpenApiSchemaTool } from "./tools/fetch-openapi-schema";
import { getOpenApiEndpointsTool } from "./tools/get-openapi-endpoints";
import { getOpenApiOperationsTool } from "./tools/get-openapi-operations";
import { getOpenApiOperationDetailsTool } from "./tools/get-openapi-operation-details";

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

    // Register the API call tool
    server.tool(
      apiCallTool.name,
      apiCallTool.description,
      apiCallTool.parameters,
      apiCallTool.handler
    );    // Register OpenAPI tools
    server.tool(
      fetchOpenApiSchemaTool.name,
      fetchOpenApiSchemaTool.description,
      fetchOpenApiSchemaTool.parameters,
      fetchOpenApiSchemaTool.handler
    );

    server.tool(
      getOpenApiEndpointsTool.name,
      getOpenApiEndpointsTool.description,
      getOpenApiEndpointsTool.parameters,
      getOpenApiEndpointsTool.handler
    );
    server.tool(
      getOpenApiOperationsTool.name,
      getOpenApiOperationsTool.description,
      getOpenApiOperationsTool.parameters,
      getOpenApiOperationsTool.handler
    );

    server.tool(
      getOpenApiOperationDetailsTool.name,
      getOpenApiOperationDetailsTool.description,
      getOpenApiOperationDetailsTool.parameters,
      getOpenApiOperationDetailsTool.handler
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