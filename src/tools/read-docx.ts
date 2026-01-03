import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Buffer } from "node:buffer";
import { z } from "zod";
import * as mammoth from "mammoth";

/**
 * Tool input schema
 */
import { analyzeDocument } from "../lib/ai.js";

export const name = "read-docx";
export const schema = z.object({
  filePath: z
    .string()
    .optional()
    .describe("Path to the DOCX file to read"),
  base64Content: z
    .string()
    .optional()
    .describe("Base64-encoded DOCX content (alternative to filePath)"),
  outputFormat: z
    .enum(["text", "html", "both"])
    .optional()
    .default("both")
    .describe("Output format: text only, HTML, or both"),
  prompt: z
    .string()
    .optional()
    .describe("Optional prompt for AI analysis of the DOCX (uses Gemini)"),
}).refine(
  (data) => data.filePath || data.base64Content,
  { message: "Either filePath or base64Content must be provided" }
);

export const description = "Extract text content from a DOCX (Word) file. Can also perform AI analysis if a prompt is provided.";

export interface MammothMessage {
  type: string;
  message: string;
}

/**
 * Main tool handler
 */
async function handler(input: z.infer<typeof schema>) {
  const { filePath, base64Content, outputFormat, prompt } = input;

  let docxBuffer: Buffer;

  if (filePath) {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    try {
      docxBuffer = await fs.readFile(absolutePath);
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  } else if (base64Content) {
    try {
      docxBuffer = Buffer.from(base64Content, "base64");
    } catch (error) {
      return {
        success: false,
        error: `Failed to decode base64 content: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  } else {
    return {
      success: false,
      error: "Either filePath or base64Content must be provided",
    };
  }

  // Validate DOCX signature (PK)
  if (!docxBuffer || docxBuffer.length < 4 || docxBuffer[0] !== 0x50 || docxBuffer[1] !== 0x4B) {
     return {
       success: false,
       error: "Invalid DOCX file: Missing PK signature",
     };
  }

  try {
    const result: {
      success: true;
      text?: string;
      html?: string;
      messages?: MammothMessage[];
      characterCount?: number;
      wordCount?: number;
    } = {
      success: true,
    };

    let extractedTextForAI = "";

    if (outputFormat === "text" || outputFormat === "both" || prompt) {
      // We need text for AI even if outputFormat is html
      const textResult = await mammoth.extractRawText({ buffer: docxBuffer });
      if (outputFormat === "text" || outputFormat === "both") {
        result.text = textResult.value;
        result.characterCount = textResult.value.length;
        result.wordCount = textResult.value.split(/\s+/).filter(Boolean).length;
      }
      extractedTextForAI = textResult.value;
    }

    if (outputFormat === "html" || outputFormat === "both") {
      const htmlResult = await mammoth.convertToHtml({ buffer: docxBuffer });
      result.html = htmlResult.value;
      result.messages = htmlResult.messages as MammothMessage[];
    }
    
    // AI Analysis if prompt provided
    let aiAnalysis;
    if (prompt && extractedTextForAI) {
      aiAnalysis = await analyzeDocument(extractedTextForAI, "text/plain", prompt);
    }

    return {
      ...result,
      ...(aiAnalysis ? { aiAnalysis } : {}),
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse DOCX: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export const metadata = {
  name,
  description,
};

export default handler;
