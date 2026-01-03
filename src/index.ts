/**
 * Documents MCP - Main Entry Point
 *
 * This module exports:
 * - Tool handlers and schemas for direct usage
 * - Client SDK for connecting to the MCP server
 * - AI document analysis utility
 */

// Re-export tools with full metadata (for direct usage / backward compatibility)
import createPdfHandler, { schema as createPdfSchema, metadata as createPdfMetadata } from "./tools/create-pdf.js";
export const createPdf = { handler: createPdfHandler, schema: createPdfSchema, ...createPdfMetadata };

import createDocxHandler, { schema as createDocxSchema, metadata as createDocxMetadata } from "./tools/create-docx.js";
export const createDocx = { handler: createDocxHandler, schema: createDocxSchema, ...createDocxMetadata };

import createPptxHandler, { schema as createPptxSchema, metadata as createPptxMetadata } from "./tools/create-pptx.js";
export const createPptx = { handler: createPptxHandler, schema: createPptxSchema, ...createPptxMetadata };

import readPdfHandler, { schema as readPdfSchema, metadata as readPdfMetadata } from "./tools/read-pdf.js";
export const readPdf = { handler: readPdfHandler, schema: readPdfSchema, ...readPdfMetadata };

import readDocxHandler, { schema as readDocxSchema, metadata as readDocxMetadata } from "./tools/read-docx.js";
export const readDocx = { handler: readDocxHandler, schema: readDocxSchema, ...readDocxMetadata };

import readPptxHandler, { schema as readPptxSchema, metadata as readPptxMetadata } from "./tools/read-pptx.js";
export const readPptx = { handler: readPptxHandler, schema: readPptxSchema, ...readPptxMetadata };

// AI document analysis
export { analyzeDocument } from "./lib/ai.js";

// Client SDK exports
export {
  DocumentsMcpClient,
  createClient,
  type DocumentsMcpClientOptions,
  type ToolCallResult,
  type ToolInfo,
  type CreatePdfOptions,
  type CreateDocxOptions,
  type CreatePptxOptions,
  type ReadPdfOptions,
  type ReadDocxOptions,
  type ReadPptxOptions,
  type TextContent,
  type HeadingContent,
  type TableContent,
  type ImageContent,
  type PageBreak,
  type PdfContentItem,
} from "./client/index.js";
