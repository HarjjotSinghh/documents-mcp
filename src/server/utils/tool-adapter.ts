import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * Result returned by existing tool handlers
 */
export interface ToolResult {
  success: boolean;
  [key: string]: unknown;
}

/**
 * MCP content format required by the protocol
 */
export interface McpToolResponse {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

/**
 * Wraps a tool handler to convert its output to MCP response format.
 *
 * Existing handlers return objects like:
 *   { success: true, filePath: "...", pageCount: 1 }
 *
 * MCP requires:
 *   { content: [{ type: "text", text: JSON.stringify(result) }] }
 */
export function wrapToolHandler<TSchema extends z.ZodType>(
  schema: TSchema,
  handler: (input: z.infer<TSchema>) => Promise<ToolResult>
): (args: Record<string, unknown>) => Promise<McpToolResponse> {
  return async (args: Record<string, unknown>) => {
    try {
      // Validate input with Zod schema
      const validatedInput = schema.parse(args);

      // Call the original handler
      const result = await handler(validatedInput);

      // Convert to MCP format
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: !result.success,
      };
    } catch (error) {
      // Handle validation or execution errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: errorMessage }, null, 2) }],
        isError: true,
      };
    }
  };
}

/**
 * Converts any Zod schema to JSON Schema format for MCP SDK.
 * This handles ZodObject, ZodEffects (from .refine()), and other Zod types.
 */
export function convertToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // Use zod-to-json-schema to convert any Zod schema to JSON Schema
  const jsonSchema = zodToJsonSchema(schema, {
    $refStrategy: "none",
    target: "openApi3",
  });

  // Return the schema, stripping the $schema property if present
  const { $schema, ...rest } = jsonSchema as Record<string, unknown>;
  return rest;
}

