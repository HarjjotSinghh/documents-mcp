import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Import all tool handlers and schemas
import createPdfHandler, {
  schema as createPdfSchema,
  name as createPdfName,
  description as createPdfDescription,
} from "../tools/create-pdf.js";

import createDocxHandler, {
  schema as createDocxSchema,
  name as createDocxName,
  description as createDocxDescription,
} from "../tools/create-docx.js";

import createPptxHandler, {
  schema as createPptxSchema,
  name as createPptxName,
  description as createPptxDescription,
} from "../tools/create-pptx.js";

import readPdfHandler, {
  schema as readPdfSchema,
  name as readPdfName,
  description as readPdfDescription,
} from "../tools/read-pdf.js";

import readDocxHandler, {
  schema as readDocxSchema,
  name as readDocxName,
  description as readDocxDescription,
} from "../tools/read-docx.js";

import readPptxHandler, {
  schema as readPptxSchema,
  name as readPptxName,
  description as readPptxDescription,
} from "../tools/read-pptx.js";

/**
 * Get the base Zod object schema (unwraps ZodEffects from .refine())
 */
function getBaseSchema<T extends z.ZodType>(schema: T): z.ZodObject<z.ZodRawShape> {
  if (schema instanceof z.ZodEffects) {
    return getBaseSchema(schema._def.schema);
  }
  return schema as unknown as z.ZodObject<z.ZodRawShape>;
}

/**
 * Convert Zod schema to JSON Schema
 */
function toJsonSchema(schema: z.ZodType): object {
  const jsonSchema = zodToJsonSchema(schema, { $refStrategy: "none" });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $schema, ...rest } = jsonSchema as Record<string, unknown>;
  return rest;
}

/**
 * Create a wrapped handler that validates input and formats output for MCP
 */
function createHandler<T extends z.ZodType>(
  schema: T,
  handler: (input: z.infer<T>) => Promise<{ success: boolean; [key: string]: unknown }>
) {
  return async (args: Record<string, unknown>) => {
    try {
      const validated = schema.parse(args);
      const result = await handler(validated);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        isError: !result.success,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: message }, null, 2) }],
        isError: true,
      };
    }
  };
}

/**
 * Registers all document tools with the MCP server
 */
export function registerAllTools(server: McpServer): void {
  // Create PDF - use the base schema shape for SDK, but full schema for validation
  const pdfShape = getBaseSchema(createPdfSchema).shape;
  server.tool(createPdfName, createPdfDescription, pdfShape, createHandler(createPdfSchema, createPdfHandler));

  // Create DOCX
  const docxShape = getBaseSchema(createDocxSchema).shape;
  server.tool(createDocxName, createDocxDescription, docxShape, createHandler(createDocxSchema, createDocxHandler));

  // Create PPTX
  const pptxShape = getBaseSchema(createPptxSchema).shape;
  server.tool(createPptxName, createPptxDescription, pptxShape, createHandler(createPptxSchema, createPptxHandler));

  // Read PDF
  const readPdfShape = getBaseSchema(readPdfSchema).shape;
  server.tool(readPdfName, readPdfDescription, readPdfShape, createHandler(readPdfSchema, readPdfHandler));

  // Read DOCX
  const readDocxShape = getBaseSchema(readDocxSchema).shape;
  server.tool(readDocxName, readDocxDescription, readDocxShape, createHandler(readDocxSchema, readDocxHandler));

  // Read PPTX
  const readPptxShape = getBaseSchema(readPptxSchema).shape;
  server.tool(readPptxName, readPptxDescription, readPptxShape, createHandler(readPptxSchema, readPptxHandler));
}

/**
 * Creates and returns a fully configured MCP server with all tools registered
 */
export function createConfiguredServer(): McpServer {
  const server = new McpServer({
    name: "documents-mcp",
    version: "1.1.0",
  });

  registerAllTools(server);

  return server;
}

/**
 * Export tool list for introspection
 */
export const toolList = [
  { name: createPdfName, description: createPdfDescription },
  { name: createDocxName, description: createDocxDescription },
  { name: createPptxName, description: createPptxDescription },
  { name: readPdfName, description: readPdfDescription },
  { name: readDocxName, description: readDocxDescription },
  { name: readPptxName, description: readPptxDescription },
];
