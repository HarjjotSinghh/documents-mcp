#!/usr/bin/env node
/**
 * STDIO transport server for documents-mcp
 *
 * This server communicates via standard input/output using JSON-RPC,
 * suitable for integration with Claude Desktop and other MCP clients.
 *
 * Usage:
 *   npx documents-mcp
 *   node dist/server/stdio.js
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createConfiguredServer } from "./register-tools.js";

async function main(): Promise<void> {
  // Create server with all tools registered
  const server = createConfiguredServer();

  // Create STDIO transport
  const transport = new StdioServerTransport();

  // Connect server to transport
  await server.connect(transport);

  // Log to stderr (stdout is reserved for MCP protocol)
  console.error("Documents MCP Server running on STDIO");
  console.error("Available tools: create-pdf, create-docx, create-pptx, read-pdf, read-docx, read-pptx");
}

// Run the server
main().catch((error) => {
  console.error("Fatal error starting Documents MCP Server:", error);
  process.exit(1);
});
