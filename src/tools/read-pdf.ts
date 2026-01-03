import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Buffer } from "node:buffer";
import process from "node:process";
import { z } from "zod";

import { analyzeDocument } from "../lib/ai";

/**
 * Tool input schema
 */
const name = "read-pdf";
export const schema = z.object({
  filePath: z
    .string()
    .optional()
    .describe("Path to the PDF file to read"),
  base64Content: z
    .string()
    .optional()
    .describe("Base64-encoded PDF content (alternative to filePath)"),
  prompt: z
    .string()
    .optional()
    .describe("Optional prompt for AI analysis of the PDF (uses Gemini)"),
}).refine(
  (data) => data.filePath || data.base64Content,
  { message: "Either filePath or base64Content must be provided" }
);

const description = "Extract text content and metadata from a PDF file. Can also perform AI analysis if a prompt is provided.";

/**
 * Main tool handler
 * 
 * Note: PDF text extraction is complex. This tool provides basic metadata
 * and indicates that the PDF was successfully read. For full text extraction,
 * consider using specialized services or libraries.
 */
async function handler(input: z.infer<typeof schema>) {
  const { filePath, base64Content, prompt } = input;

  let pdfBuffer: Buffer;

  if (filePath) {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    try {
      pdfBuffer = await fs.readFile(absolutePath);
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  } else if (base64Content) {
    try {
      pdfBuffer = Buffer.from(base64Content, "base64");
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

  // Validate PDF signature (%PDF)
  if (!pdfBuffer || pdfBuffer.length < 5 || pdfBuffer.toString("latin1", 0, 5) !== "%PDF-") {
      return {
        success: false,
        error: "Invalid PDF file: Missing %PDF header",
      };
  }

  try {
    // Basic PDF validation and info extraction
    const pdfString = pdfBuffer.toString("latin1");
    
    // Check if it's a valid PDF
    if (!pdfString.startsWith("%PDF-")) {
      return {
        success: false,
        error: "Invalid PDF file: missing PDF header",
      };
    }

    // Extract PDF version
    const versionMatch = pdfString.match(/%PDF-(\d+\.\d+)/);
    const pdfVersion = versionMatch ? versionMatch[1] : "unknown";

    // Count pages (rough estimate based on /Page objects)
    const pageMatches = pdfString.match(/\/Type\s*\/Page[^s]/g);
    const estimatedPageCount = pageMatches ? pageMatches.length : 0;

    // Extract text between streams (simplified extraction)
    const textContent: string[] = [];
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    let match;
    
    while ((match = streamRegex.exec(pdfString)) !== null) {
      // Extract readable text from stream
      const streamContent = match[1];
      // Look for text operators (Tj, TJ, etc.)
      const textMatches = streamContent.match(/\(([^)]*)\)\s*Tj/g);
      if (textMatches) {
        for (const textMatch of textMatches) {
          const extracted = textMatch.match(/\(([^)]*)\)/);
          if (extracted && extracted[1]) {
            textContent.push(extracted[1]);
          }
        }
      }
    }

    const extractedText = textContent.join(" ").trim();
    
    // AI Analysis if prompt provided
    let aiAnalysis;
    if (prompt) {
      aiAnalysis = await analyzeDocument(pdfBuffer, "application/pdf", prompt);
    }

    return {
      success: true,
      metadata: {
        pdfVersion,
        estimatedPageCount,
        fileSizeBytes: pdfBuffer.length,
      },
      text: extractedText || "[Text extraction limited - PDF may use compressed streams or complex encoding]",
      note: "For complex PDFs with compressed content, text extraction may be limited. Consider using specialized PDF processing services for complete extraction.",
      ...(aiAnalysis ? { aiAnalysis } : {}),
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export const metadata = {
  name,
  description,
};

export default handler;
