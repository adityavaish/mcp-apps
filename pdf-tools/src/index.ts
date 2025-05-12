#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { extractTextTool } from "./tools/extract-text";

async function main() {
  try {
    const server = new McpServer({
      name: process.env.MCP_SERVER_NAME || "pdf-tools-mcp-server",
      description: "PDF Tools MCP Server for document processing and analysis",
      version: process.env.MCP_SERVER_VERSION || "1.0.0",
      capabilities: {
        resources: {},
        tools: {},
      },
    });
    
    server.tool(
      extractTextTool.name,
      extractTextTool.description,
      extractTextTool.parameters,
      extractTextTool.handler
    );
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("PDF Tools MCP Server running on stdio");
  }
  catch (error: any) {
    console.error("Error starting MCP server:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

main();