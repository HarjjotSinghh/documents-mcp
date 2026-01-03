import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";

// Import tools (default exports)
import createPdfTool from "../../src/tools/create-pdf";
import createDocxTool from "../../src/tools/create-docx";
import createPptxTool from "../../src/tools/create-pptx";
import readPdfTool from "../../src/tools/read-pdf";
import readDocxTool from "../../src/tools/read-docx";
import readPptxTool from "../../src/tools/read-pptx";

// Mock AI helper
vi.mock("../../src/lib/ai", () => ({
  analyzeDocument: vi.fn(),
}));

import { analyzeDocument } from "../../src/lib/ai";

const TEST_OUTPUT_DIR = path.join(process.cwd(), "tests/fixtures/output");

describe("Unit Tests: Document Tools", () => {
  beforeAll(async () => {
    // Create output directory for test files
    await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Cleanup test files
    try {
      const files = await fs.readdir(TEST_OUTPUT_DIR);
      for (const file of files) {
        await fs.unlink(path.join(TEST_OUTPUT_DIR, file));
      }
    } catch {
      // Ignore errors during cleanup
    }
  });

  describe("create-pdf tool", () => {
    it("should create a PDF with basic text content and return base64", async () => {
      const input = {
        title: "Test PDF Document",
        content: [
          { type: "text", content: "This is a test paragraph." } as const,
        ],
      };
      const result = await createPdfTool.handler(createPdfTool.schema.parse(input));

      expect(result.success).toBe(true);
      expect(result.base64).toBeDefined();
      expect(result.pageCount).toBeGreaterThanOrEqual(1);

      // Verify it's valid base64 PDF
      const buffer = Buffer.from(result.base64 as string, "base64");
      expect(buffer.toString("latin1").startsWith("%PDF-")).toBe(true);
    });

    it("should create a PDF with headings", async () => {
      const input = {
        title: "Document with Headings",
        content: [
          { type: "heading", content: "Main Heading", level: 1 } as const,
          { type: "heading", content: "Sub Heading", level: 2 } as const,
          { type: "text", content: "Body text under heading." } as const,
        ],
      };
      const result = await createPdfTool.handler(createPdfTool.schema.parse(input));

      expect(result.success).toBe(true);
      expect(result.base64).toBeDefined();
    });

    it("should create a PDF with a table", async () => {
      const input = {
        title: "Document with Table",
        content: [
          {
            type: "table" as const,
            headers: ["Name", "Age", "City"],
            rows: [
              ["Alice", "30", "New York"],
              ["Bob", "25", "Los Angeles"],
            ],
          },
        ],
      };
      const result = await createPdfTool.handler(createPdfTool.schema.parse(input));

      expect(result.success).toBe(true);
      expect(result.base64).toBeDefined();
    });

    it("should save PDF to file when outputPath is provided", async () => {
      const outputPath = path.join(TEST_OUTPUT_DIR, "test-output.pdf");
      
      const input = {
        title: "Saved PDF Document",
        content: [{ type: "text", content: "This PDF is saved to disk." } as const],
        outputPath,
      };
      const result = await createPdfTool.handler(createPdfTool.schema.parse(input));

      expect(result.success).toBe(true);
      expect(result.filePath).toBe(outputPath);

      // Verify file exists
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe("create-docx tool", () => {
    it("should create a DOCX with basic text content and return base64", async () => {
      const input = {
        title: "Test DOCX Document",
        content: [
          { type: "paragraph", content: "This is a test paragraph." } as const,
        ],
      };
      const result = await createDocxTool.handler(createDocxTool.schema.parse(input));

      expect(result.success).toBe(true);
      expect(result.base64).toBeDefined();

      // Verify it's valid ZIP (DOCX is a ZIP file)
      const buffer = Buffer.from(result.base64 as string, "base64");
      expect(buffer[0]).toBe(0x50); // PK signature
      expect(buffer[1]).toBe(0x4b);
    });

    it("should save DOCX to file when outputPath is provided", async () => {
      const outputPath = path.join(TEST_OUTPUT_DIR, "test-output.docx");
      
      const input = {
        title: "Saved DOCX Document",
        content: [{ type: "paragraph", content: "This DOCX is saved to disk." } as const],
        outputPath,
      };
      const result = await createDocxTool.handler(createDocxTool.schema.parse(input));

      expect(result.success).toBe(true);
      expect(result.filePath).toBe(outputPath);

      // Verify file exists
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe("create-pptx tool", () => {
    it("should create a PPTX with title slide and return base64", async () => {
      const input = {
        title: "Test Presentation",
        slides: [
          {
            title: "Welcome",
            subtitle: "Introduction Slide",
            layout: "title",
          } as const,
        ],
      };
      const result = await createPptxTool.handler(createPptxTool.schema.parse(input));

      expect(result.success).toBe(true);
      expect(result.base64).toBeDefined();
      expect(result.slideCount).toBe(1);

      // Verify it's valid ZIP (PPTX is a ZIP file)
      const buffer = Buffer.from(result.base64 as string, "base64");
      expect(buffer[0]).toBe(0x50); // PK signature
      expect(buffer[1]).toBe(0x4b);
    });

    it("should save PPTX to file when outputPath is provided", async () => {
      const outputPath = path.join(TEST_OUTPUT_DIR, "test-output.pptx");
      
      const input = {
        title: "Saved Presentation",
        slides: [{ title: "Saved Slide", layout: "title" } as const],
        outputPath,
      };
      const result = await createPptxTool.handler(createPptxTool.schema.parse(input));

      expect(result.success).toBe(true);
      expect(result.filePath).toBe(outputPath);

      // Verify file exists
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe("read-pdf tool", () => {
    it("should read PDF from file and extract metadata", async () => {
      const pdfPath = path.join(TEST_OUTPUT_DIR, "test-read.pdf");
      const createInput = {
        title: "Readable PDF",
        content: [{ type: "text", content: "Test content for reading." } as const],
        outputPath: pdfPath,
      };
      await createPdfTool.handler(createPdfTool.schema.parse(createInput));

      const readInput = {
        filePath: pdfPath,
      };
      const result = await readPdfTool.handler(readPdfTool.schema.parse(readInput));

      expect(result.success).toBe(true);
      if (result.success) {
        // @ts-expect-error - intentionally passing invalid input
        expect(result.metadata).toBeDefined();
        // @ts-expect-error - intentionally passing invalid input
        expect(result.metadata?.pdfVersion).toBeDefined();
      }
    });

    it("should call AI analysis when prompt is provided", async () => {
      // Mock AI response
      (analyzeDocument as any).mockResolvedValue({
        success: true,
        text: "AI Analysis Result",
      });

      const input = {
        base64Content: Buffer.from("%PDF-1.4\n...").toString("base64"),
        prompt: "Analyze this PDF",
      };
      
      // We pass a minimal valid PDF-like buffer to avoid basic validation errors
      // Note: In real world, creating a tiny valid PDF buffer is better, 
      // but for this unit test mocking readFile/Buffer or ensuring minimal structure is key.
      // Let's create a real valid minimal PDF using createPdf first.
      const createInput = { title: "AI PDF", content: [{ type:"text", content:"content" }] };
      const createResult = await createPdfTool.handler(createPdfTool.schema.parse(createInput));
      
      if (!createResult.success || !createResult.base64) throw new Error("Failed to create PDF");

      const readInput = {
        base64Content: createResult.base64,
        prompt: "Analyze this",
      };

      const result = await readPdfTool.handler(readPdfTool.schema.parse(readInput));

      expect(result.success).toBe(true);
      expect(analyzeDocument).toHaveBeenCalled();
      if (result.success) {
         expect((result as any).aiAnalysis).toBeDefined();
         expect((result as any).aiAnalysis.text).toBe("AI Analysis Result");
      }
    });
  });

  describe("read-docx tool", () => {
    it("should read DOCX and extract text", async () => {
      const docxPath = path.join(TEST_OUTPUT_DIR, "test-read.docx");
      const createInput = {
        title: "Readable DOCX",
        content: [{ type: "paragraph", content: "This is readable content." } as const],
        outputPath: docxPath,
      };
      await createDocxTool.handler(createDocxTool.schema.parse(createInput));

      const readInput = { filePath: docxPath };
      const result = await readDocxTool.handler(readDocxTool.schema.parse(readInput));

      expect(result.success).toBe(true);
      if (result.success) {
        // @ts-expect-error - intentionally passing invalid input
        expect(result.text).toContain("Readable DOCX");
      }
    });

    it("should call AI analysis when prompt is provided", async () => {
      (analyzeDocument as any).mockResolvedValue({
        success: true,
        text: "AI Analysis Result",
      });

      const createInput = { title: "AI DOCX", content: [{ type:"paragraph", content:"content" }] };
      const createResult = await createDocxTool.handler(createDocxTool.schema.parse(createInput));

      if (!createResult.success || !createResult.base64) throw new Error("Failed to create DOCX");

      const readInput = {
        base64Content: createResult.base64,
        prompt: "Analyze this",
      };

      const result = await readDocxTool.handler(readDocxTool.schema.parse(readInput));

      expect(result.success).toBe(true);
      expect(analyzeDocument).toHaveBeenCalled();
      if (result.success) {
         expect((result as any).aiAnalysis).toBeDefined();
      }
    });
  });

  describe("read-pptx tool", () => {
    it("should read PPTX and extract text", async () => {
      const pptxPath = path.join(TEST_OUTPUT_DIR, "test-read.pptx");
      const createInput = {
        title: "Readable PPTX",
        slides: [{ title: "Slide 1", layout: "title" } as const],
        outputPath: pptxPath,
      };
      await createPptxTool.handler(createPptxTool.schema.parse(createInput));

      const readInput = { filePath: pptxPath };
      const result = await readPptxTool.handler(readPptxTool.schema.parse(readInput));

      expect(result.success).toBe(true);
      if (result.success) {
        // @ts-expect-error - intentionally passing invalid input
        expect(result.text).toContain("Slide 1");
        // @ts-expect-error - intentionally passing invalid input
        expect(result.slideCount).toBe(1);
      }
    });

    it("should call AI analysis when prompt is provided", async () => {
      (analyzeDocument as any).mockResolvedValue({
        success: true,
        text: "AI Analysis Result",
      });

      const createInput = {
        title: "AI PPTX",
        slides: [{ title: "Slide 1", layout: "title" } as const],
      };
      const createResult = await createPptxTool.handler(createPptxTool.schema.parse(createInput));

      if (!createResult.success || !createResult.base64) throw new Error("Failed to create PPTX");

      const readInput = {
        base64Content: createResult.base64,
        prompt: "Analyze this",
      };

      const result = await readPptxTool.handler(readPptxTool.schema.parse(readInput));

      expect(result.success).toBe(true);
      expect(analyzeDocument).toHaveBeenCalled();
      if (result.success) {
         expect((result as any).aiAnalysis).toBeDefined();
      }
    });
  });
});
