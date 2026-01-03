/**
 * Documents MCP Client SDK
 *
 * Provides a TypeScript client for connecting to the documents-mcp server
 * and calling document creation/reading tools.
 *
 * @example
 * ```typescript
 * import { createClient } from "documents-mcp/client";
 *
 * const client = createClient({
 *   transport: "stdio",
 *   command: "documents-mcp",
 * });
 *
 * await client.connect();
 * const result = await client.createPdf({
 *   title: "My Document",
 *   content: [{ type: "text", content: "Hello World" }],
 * });
 * await client.disconnect();
 * ```
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

/**
 * Client configuration options
 */
export interface DocumentsMcpClientOptions {
  /** Transport type to use */
  transport: "stdio" | "sse";
  /** Command to run for STDIO transport (default: "documents-mcp") */
  command?: string;
  /** Arguments for the command */
  args?: string[];
  /** URL for SSE transport (e.g., "http://localhost:3000/sse") */
  url?: string;
}

/**
 * Result from a tool call
 */
export interface ToolCallResult<T = unknown> {
  success: boolean;
  content: T;
  raw?: unknown;
}

/**
 * Tool information
 */
export interface ToolInfo {
  name: string;
  description: string;
}

/**
 * Content item for PDF/DOCX documents
 */
export interface TextContent {
  type: "text";
  content: string;
  fontSize?: number;
  bold?: boolean;
  color?: { r: number; g: number; b: number };
}

export interface HeadingContent {
  type: "heading";
  content: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface TableContent {
  type: "table";
  headers: string[];
  rows: string[][];
}

export interface ImageContent {
  type: "image";
  base64: string;
  format: "png" | "jpg" | "jpeg";
  width?: number;
  height?: number;
}

export interface PageBreak {
  type: "pageBreak";
}

export type PdfContentItem = TextContent | HeadingContent | TableContent | ImageContent | PageBreak;

/**
 * Create PDF options
 */
export interface CreatePdfOptions {
  title: string;
  author?: string;
  content: PdfContentItem[];
  outputPath?: string;
  pageSize?: "A4" | "Letter" | "Legal";
}

/**
 * Create DOCX options
 */
export interface CreateDocxOptions {
  title: string;
  author?: string;
  content: Array<Record<string, unknown>>;
  outputPath?: string;
}

/**
 * Create PPTX options
 */
export interface CreatePptxOptions {
  title: string;
  author?: string;
  subject?: string;
  slides: Array<Record<string, unknown>>;
  outputPath?: string;
}

/**
 * Read PDF options
 */
export interface ReadPdfOptions {
  filePath?: string;
  base64Content?: string;
  prompt?: string;
}

/**
 * Read DOCX options
 */
export interface ReadDocxOptions {
  filePath?: string;
  base64Content?: string;
  outputFormat?: "text" | "html" | "both";
  prompt?: string;
}

/**
 * Read PPTX options
 */
export interface ReadPptxOptions {
  filePath?: string;
  base64Content?: string;
  prompt?: string;
}

/**
 * Documents MCP Client
 *
 * A client for interacting with the documents-mcp server.
 */
export class DocumentsMcpClient {
  private client: Client;
  private transport: StdioClientTransport | SSEClientTransport | null = null;
  private connected = false;
  private options: DocumentsMcpClientOptions;

  constructor(options: DocumentsMcpClientOptions) {
    this.options = options;
    this.client = new Client(
      {
        name: "documents-mcp-client",
        version: "1.1.0",
      },
      {
        capabilities: {},
      }
    );
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    if (this.options.transport === "stdio") {
      const command = this.options.command || "documents-mcp";
      const args = this.options.args || [];

      this.transport = new StdioClientTransport({
        command,
        args,
      });
    } else if (this.options.transport === "sse") {
      if (!this.options.url) {
        throw new Error("URL is required for SSE transport");
      }
      this.transport = new SSEClientTransport(new URL(this.options.url));
    } else {
      throw new Error(`Unknown transport: ${this.options.transport}`);
    }

    await this.client.connect(this.transport);
    this.connected = true;
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    await this.client.close();
    this.connected = false;
    this.transport = null;
  }

  /**
   * Check if connected to the server
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * List available tools from the server
   */
  async listTools(): Promise<ToolInfo[]> {
    this.ensureConnected();

    const result = await this.client.listTools();
    return result.tools.map((tool) => ({
      name: tool.name,
      description: tool.description || "",
    }));
  }

  /**
   * Call a tool on the server
   */
  async callTool<T = unknown>(name: string, args: Record<string, unknown>): Promise<ToolCallResult<T>> {
    this.ensureConnected();

    const result = await this.client.callTool({
      name,
      arguments: args,
    });

    // Parse the JSON response from content
    const content = result.content as Array<{ type: string; text?: string }>;
    const textContent = content.find((c): c is { type: "text"; text: string } => c.type === "text");

    if (textContent) {
      try {
        const parsed = JSON.parse(textContent.text) as T & { success?: boolean };
        return {
          success: parsed.success ?? true,
          content: parsed,
          raw: result,
        };
      } catch {
        return {
          success: true,
          content: textContent.text as unknown as T,
          raw: result,
        };
      }
    }

    return {
      success: true,
      content: result.content as unknown as T,
      raw: result,
    };
  }

  // ============================================
  // Convenience methods for each tool
  // ============================================

  /**
   * Create a PDF document
   */
  async createPdf(options: CreatePdfOptions): Promise<ToolCallResult> {
    return this.callTool("create-pdf", options as unknown as Record<string, unknown>);
  }

  /**
   * Create a DOCX (Word) document
   */
  async createDocx(options: CreateDocxOptions): Promise<ToolCallResult> {
    return this.callTool("create-docx", options as unknown as Record<string, unknown>);
  }

  /**
   * Create a PPTX (PowerPoint) presentation
   */
  async createPptx(options: CreatePptxOptions): Promise<ToolCallResult> {
    return this.callTool("create-pptx", options as unknown as Record<string, unknown>);
  }

  /**
   * Read and extract text from a PDF file
   */
  async readPdf(options: ReadPdfOptions): Promise<ToolCallResult> {
    return this.callTool("read-pdf", options as unknown as Record<string, unknown>);
  }

  /**
   * Read and extract text from a DOCX file
   */
  async readDocx(options: ReadDocxOptions): Promise<ToolCallResult> {
    return this.callTool("read-docx", options as unknown as Record<string, unknown>);
  }

  /**
   * Read and extract text from a PPTX file
   */
  async readPptx(options: ReadPptxOptions): Promise<ToolCallResult> {
    return this.callTool("read-pptx", options as unknown as Record<string, unknown>);
  }

  /**
   * Ensure the client is connected before making calls
   */
  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error("Client is not connected. Call connect() first.");
    }
  }
}

/**
 * Create a new Documents MCP client
 *
 * @example
 * ```typescript
 * // STDIO transport (for CLI usage)
 * const client = createClient({
 *   transport: "stdio",
 *   command: "documents-mcp",
 * });
 *
 * // SSE transport (for HTTP server)
 * const client = createClient({
 *   transport: "sse",
 *   url: "http://localhost:3000/sse",
 * });
 * ```
 */
export function createClient(options: DocumentsMcpClientOptions): DocumentsMcpClient {
  return new DocumentsMcpClient(options);
}
