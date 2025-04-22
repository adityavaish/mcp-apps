#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { listTablesTool } from "./tools/list-tables";
import { getTableSchemaTool } from "./tools/get-table-schema";
import { executeQueryTool } from "./tools/execute-query";

async function main() {
  try {
    const server = new McpServer({
      name: process.env.MCP_SERVER_NAME || "kusto-mcp-server",
      description: "Kusto MCP Server for Azure Data Explorer integration",
      version: process.env.MCP_SERVER_VERSION || "1.0.0",
      capabilities: {
        resources: {},
        tools: {},
      },
    });

    server.tool(
      listTablesTool.name,
      listTablesTool.description,
      listTablesTool.parameters,
      listTablesTool.handler
    );

    server.tool(
      getTableSchemaTool.name,
      getTableSchemaTool.description,
      getTableSchemaTool.parameters,
      getTableSchemaTool.handler
    );

    server.tool(
      executeQueryTool.name,
      executeQueryTool.description,
      executeQueryTool.parameters,
      executeQueryTool.handler
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Kusto MCP Server running on stdio");
  }
  catch (error: any) {
    console.error("Error starting MCP server:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

main();