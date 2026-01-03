#!/usr/bin/env node
/**
 * HTTP/SSE transport server for documents-mcp
 *
 * This server provides an HTTP interface with Server-Sent Events (SSE)
 * for web-based MCP clients.
 *
 * Endpoints:
 *   GET  /sse      - SSE connection endpoint
 *   POST /messages - Message endpoint for client requests
 *   GET  /health   - Health check endpoint
 *
 * Usage:
 *   PORT=3000 npx documents-mcp-http
 *   node dist/server/http.js
 */

import express, { Request, Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createConfiguredServer } from "./register-tools.js";

const PORT = parseInt(process.env.PORT || "3000", 10);

// Create Express app
const app = express();
app.use(express.json());

// Store active transports by session ID
const transports = new Map<string, SSEServerTransport>();

/**
 * SSE connection endpoint
 * Clients connect here to establish an SSE stream for receiving messages
 */
app.get("/sse", async (req: Request, res: Response) => {
  // Generate unique session ID
  const sessionId = crypto.randomUUID();

  console.error(`New SSE connection: ${sessionId}`);

  // Create SSE transport with the messages endpoint path
  const transport = new SSEServerTransport("/messages", res);

  // Store transport for later message handling
  transports.set(sessionId, transport);

  // Create a new server instance for this connection
  const server = createConfiguredServer();

  // Clean up on connection close
  res.on("close", () => {
    console.error(`SSE connection closed: ${sessionId}`);
    transports.delete(sessionId);
  });

  // Connect server to transport
  await server.connect(transport);
});

/**
 * Messages endpoint
 * Clients send JSON-RPC messages here
 */
app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    res.status(400).json({ error: "Missing sessionId query parameter" });
    return;
  }

  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(404).json({ error: "Session not found. Connect to /sse first." });
    return;
  }

  try {
    await transport.handlePostMessage(req, res);
  } catch (error) {
    console.error(`Error handling message for session ${sessionId}:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Health check endpoint
 */
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    server: "documents-mcp",
    version: "1.1.0",
    activeSessions: transports.size,
    tools: ["create-pdf", "create-docx", "create-pptx", "read-pdf", "read-docx", "read-pptx"],
  });
});

/**
 * Root endpoint with server info
 */
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "documents-mcp",
    version: "1.1.0",
    description: "MCP server for creating and reading PDF, DOCX, and PPTX documents",
    endpoints: {
      sse: "GET /sse - SSE connection for MCP clients",
      messages: "POST /messages?sessionId=<id> - Send messages to server",
      health: "GET /health - Server health check",
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.error(`Documents MCP HTTP Server running on port ${PORT}`);
  console.error(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.error(`Health check: http://localhost:${PORT}/health`);
});
