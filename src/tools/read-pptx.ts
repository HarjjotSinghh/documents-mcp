import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Buffer } from "node:buffer";
import process from "node:process";
import { z } from "zod";
import JSZip from "jszip";
import { analyzeDocument } from "../lib/ai.js";

export const name = "read-pptx";
export const schema = z.object({
  filePath: z
    .string()
    .optional()
    .describe("Path to the PPTX file to read"),
  base64Content: z
    .string()
    .optional()
    .describe("Base64-encoded PPTX content (alternative to filePath)"),
  prompt: z
    .string()
    .optional()
    .describe("Optional prompt for AI analysis of the PPTX (uses Gemini)"),
}).refine(
  (data) => data.filePath || data.base64Content,
  { message: "Either filePath or base64Content must be provided" }
);

export const description = "Extract text content from a PPTX (PowerPoint) file. Can also perform AI analysis if a prompt is provided.";

/**
 * Extract text from a single slide XML
 */
function extractTextFromSlideXML(xml: string): string {
  // Simple regex to find <a:t> content
  const textMatches = xml.match(/<a:t.*?>(.*?)<\/a:t>/g);
  if (!textMatches) return "";
  
  return textMatches
    .map(match => {
      // Remove tags to get inner text
      return match.replace(/<.*?>/g, "");
    })
    .join(" ");
}

/**
 * Main tool handler
 */
async function handler(input: z.infer<typeof schema>) {
  const { filePath, base64Content, prompt } = input;

  let pptxBuffer: Buffer;

  if (filePath) {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    try {
      pptxBuffer = await fs.readFile(absolutePath);
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  } else if (base64Content) {
    try {
      pptxBuffer = Buffer.from(base64Content, "base64");
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

  // Validate PPTX signature (PK)
  if (!pptxBuffer || pptxBuffer.length < 4 || pptxBuffer[0] !== 0x50 || pptxBuffer[1] !== 0x4B) {
     return {
       success: false,
       error: "Invalid PPTX file: Missing PK signature",
     };
  }

  try {
    const zip = await JSZip.loadAsync(pptxBuffer);
    
    // Find all slide files
    const slideFiles = Object.keys(zip.files).filter(fileName => 
      fileName.match(/ppt\/slides\/slide\d+\.xml/)
    );
    
    // Sort slides by number (slide1, slide2, etc.)
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || "0");
      const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || "0");
      return numA - numB;
    });

    const slides: { slide: number; text: string }[] = [];
    let fullText = "";

    for (let i = 0; i < slideFiles.length; i++) {
      const fileName = slideFiles[i];
      const content = await zip.files[fileName].async("string");
      const text = extractTextFromSlideXML(content);
      
      slides.push({
        slide: i + 1,
        text: text,
      });
      
      fullText += `Slide ${i + 1}:\n${text}\n\n`;
    }

    // AI Analysis if prompt provided
    let aiAnalysis;
    if (prompt && fullText) {
      aiAnalysis = await analyzeDocument(fullText, "text/plain", prompt);
    }

    return {
      success: true,
      slideCount: slideFiles.length,
      slides,
      text: fullText.trim(),
      ...(aiAnalysis ? { aiAnalysis } : {}),
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse PPTX: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export const metadata = {
  name,
  description,
};

export default handler;
