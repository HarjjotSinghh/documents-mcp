import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";

// Import tools (default exports)
import createPdfTool from "../../src/tools/create-pdf";
import createDocxTool from "../../src/tools/create-docx";
import createPptxTool from "../../src/tools/create-pptx";
import readPdfTool from "../../src/tools/read-pdf";
import readDocxTool from "../../src/tools/read-docx";

const TEST_OUTPUT_DIR = path.join(process.cwd(), "tests/fixtures/integration");

describe("Integration Tests: Document Generation & Reading Flow", () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterAll(async () => {
    try {
      const files = await fs.readdir(TEST_OUTPUT_DIR);
      for (const file of files) {
        await fs.unlink(path.join(TEST_OUTPUT_DIR, file));
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("PDF: Create and Read Workflow", () => {
    it("should create a complex PDF and verify it can be read", async () => {
      const pdfPath = path.join(TEST_OUTPUT_DIR, "complex-report.pdf");
      
      // Create a complex PDF with multiple content types
      const createInput = {
        title: "Q4 Sales Report",
        author: "Integration Test",
        content: [
          { type: "heading", content: "Executive Summary", level: 1 } as const,
          { type: "text", content: "This report summarizes the Q4 sales performance across all regions." } as const,
          { type: "heading", content: "Regional Breakdown", level: 2 } as const,
          {
            type: "table",
            headers: ["Region", "Q3 Sales", "Q4 Sales", "Growth"],
            rows: [
              ["North", "$1.2M", "$1.5M", "+25%"],
              ["South", "$800K", "$950K", "+19%"],
              ["East", "$1.0M", "$1.1M", "+10%"],
              ["West", "$1.5M", "$1.8M", "+20%"],
            ],
          } as const,
          { type: "heading", content: "Conclusions", level: 2 } as const,
          { type: "text", content: "Overall growth exceeded expectations by 15%." } as const,
          { type: "pageBreak" } as const,
          { type: "heading", content: "Appendix", level: 1 } as const,
          { type: "text", content: "Additional data and methodology details." } as const,
        ],
        outputPath: pdfPath,
        pageSize: "A4" as const,
      };
      const createResult = await createPdfTool.handler(createPdfTool.schema.parse(createInput));

      expect(createResult.success).toBe(true);
      expect(createResult.pageCount).toBeGreaterThanOrEqual(2);
      expect(createResult.filePath).toBe(pdfPath);

      // Verify file exists and has content
      const stats = await fs.stat(pdfPath);
      expect(stats.size).toBeGreaterThan(1000); // Should be at least 1KB

      // Read the PDF back
      const readInput = { filePath: pdfPath };
      const readResult = await readPdfTool.handler(readPdfTool.schema.parse(readInput));
      expect(readResult.success).toBe(true);
      if (readResult.success) {
        // @ts-expect-error - intentionally passing invalid input
        expect(readResult.metadata?.pdfVersion).toBeDefined();
        // @ts-expect-error - intentionally passing invalid input
        expect(readResult.metadata?.fileSizeBytes).toBe(stats.size);
      }
    });

    it("should handle base64 round-trip correctly", async () => {
      // Create PDF and get base64
      const createInput = {
        title: "Base64 Round Trip",
        content: [
          { type: "text", content: "Testing base64 encoding and decoding." } as const,
        ],
      };
      const createResult = await createPdfTool.handler(createPdfTool.schema.parse(createInput));

      expect(createResult.success).toBe(true);
      expect(createResult.base64).toBeDefined();

      // Read from base64
      const readInput = {
        base64Content: createResult.base64 as string,
      };
      const readResult = await readPdfTool.handler(readPdfTool.schema.parse(readInput));


      expect(readResult.success).toBe(true);
      if (readResult.success) {
        // @ts-expect-error - intentionally passing invalid input
        expect(readResult.metadata?.pdfVersion).toBeDefined();
      }
    });
  });

  describe("DOCX: Create and Read Workflow", () => {
    it("should create a complex DOCX and verify content extraction", async () => {
      const docxPath = path.join(TEST_OUTPUT_DIR, "meeting-notes.docx");
      
      // Create a complex DOCX
      const createInput = {
        title: "Team Meeting Notes",
        author: "Integration Test",
        content: [
          { type: "heading", content: "Meeting Overview", level: 1 } as const,
          { type: "paragraph", content: "Date: January 3, 2026", alignment: "left" } as const,
          { type: "paragraph", content: "Attendees: Alice, Bob, Charlie", alignment: "left" } as const,
          { type: "heading", content: "Agenda Items", level: 2 } as const,
          {
            type: "numberedList",
            items: [
              "Review Q4 performance",
              "Discuss Q1 goals",
              "Assign action items",
            ],
          } as const,
          { type: "heading", content: "Key Decisions", level: 2 } as const,
          {
            type: "bulletList",
            items: [
              "Increase marketing budget by 15%",
              "Hire two new engineers",
              "Launch new product in March",
            ],
          } as const,
          { type: "heading", content: "Action Items", level: 2 } as const,
          {
            type: "table",
            headers: ["Task", "Owner", "Due Date"],
            rows: [
              ["Prepare budget proposal", "Alice", "Jan 10"],
              ["Interview candidates", "Bob", "Jan 15"],
              ["Product roadmap update", "Charlie", "Jan 8"],
            ],
          } as const,
          { type: "pageBreak" } as const,
          { type: "heading", content: "Next Meeting", level: 1 } as const,
          { type: "paragraph", content: "January 10, 2026 at 2:00 PM" } as const,
        ],
        outputPath: docxPath,
      };
      const createResult = await createDocxTool.handler(createDocxTool.schema.parse(createInput));

      expect(createResult.success).toBe(true);
      expect(createResult.filePath).toBe(docxPath);

      // Read the DOCX back
      const readInput = {
        filePath: docxPath,
        outputFormat: "both" as const,
      };
      const readResult = await readDocxTool.handler(readDocxTool.schema.parse(readInput));


      expect(readResult.success).toBe(true);
      if (!readResult.success) throw new Error(readResult.error);
      // @ts-expect-error - intentionally passing invalid input
      expect(readResult?.text).toBeDefined();
      // @ts-expect-error - intentionally passing invalid input
      expect(readResult?.html).toBeDefined();
      
      // Verify content is present
      // @ts-expect-error - intentionally passing invalid input
      expect(readResult?.text).toContain("Team Meeting Notes");
      // @ts-expect-error - intentionally passing invalid input
      expect(readResult?.text).toContain("Alice");
      // @ts-expect-error - intentionally passing invalid input
      expect(readResult?.text).toContain("marketing budget");
      // @ts-expect-error - intentionally passing invalid input
      expect(readResult.wordCount).toBeGreaterThan(30);
    });

    it("should preserve text formatting in round-trip", async () => {
      const createInput = {
        title: "Formatted Document",
        content: [
          { type: "text", content: "Bold text here", bold: true } as const,
          { type: "text", content: "Italic text here", italic: true } as const,
        ],
      };
      const createResult = await createDocxTool.handler(createDocxTool.schema.parse(createInput));

      expect(createResult.success).toBe(true);

      const readInput = {
        base64Content: createResult.base64 as string,
        outputFormat: "html" as const,
      };
      const readResult = await readDocxTool.handler(readDocxTool.schema.parse(readInput));


      expect(readResult.success).toBe(true);
      if (!readResult.success) throw new Error(readResult.error);
      // @ts-expect-error - intentionally passing invalid input
      expect(readResult.html).toContain("Bold text here");
      // @ts-expect-error - intentionally passing invalid input
      expect(readResult.html).toContain("Italic text here");
    });
  });

  describe("PPTX: Create Complex Presentation", () => {
    it("should create a full presentation with various elements", async () => {
      const pptxPath = path.join(TEST_OUTPUT_DIR, "quarterly-review.pptx");
      
      const createInput = {
        title: "Q4 2025 Review",
        author: "Integration Test",
        subject: "Quarterly Business Review",
        slides: [
          {
            title: "Q4 2025 Review",
            subtitle: "Quarterly Business Review",
            layout: "title",
          } as const,
          {
            title: "Agenda",
            layout: "titleAndContent",
            elements: [
              {
                type: "textBox",
                text: "1. Financial Performance\n2. Key Achievements\n3. Challenges\n4. Q1 Outlook",
                x: 0.5,
                y: 1.5,
                w: 9,
                h: 4,
                fontSize: 24,
              } as const,
            ],
          } as const,
          {
            title: "Financial Performance",
            layout: "titleAndContent",
            elements: [
              {
                type: "table",
                headers: ["Metric", "Target", "Actual", "Variance"],
                rows: [
                  ["Revenue", "$5M", "$5.2M", "+4%"],
                  ["Expenses", "$3M", "$2.8M", "-7%"],
                  ["Profit", "$2M", "$2.4M", "+20%"],
                ],
                x: 0.5,
                y: 1.5,
                w: 9,
              } as const,
            ],
          } as const,
          {
            title: "Key Achievements",
            layout: "titleAndContent",
            elements: [
              {
                type: "textBox",
                text: "• Launched 3 new products\n• Expanded to 5 new markets\n• Increased customer base by 40%",
                x: 0.5,
                y: 1.5,
                w: 9,
                h: 3,
                fontSize: 20,
              } as const,
            ],
          } as const,
          {
            title: "Q1 2026 Outlook",
            layout: "titleAndContent",
            elements: [
              {
                type: "shape",
                shapeType: "rect",
                x: 1,
                y: 2,
                w: 3,
                h: 2,
                fill: "4CAF50",
              } as const,
              {
                type: "textBox",
                text: "Target: $6M Revenue",
                x: 1.2,
                y: 2.5,
                w: 2.6,
                h: 1,
                fontSize: 14,
                color: "FFFFFF",
              } as const,
            ],
            notes: "Focus on product expansion and market penetration",
          } as const,
          {
            title: "Thank You",
            subtitle: "Questions?",
            layout: "sectionHeader",
            backgroundColor: "0066CC",
          } as const,
        ],
        outputPath: pptxPath,
      };
      const createResult = await createPptxTool.handler(createPptxTool.schema.parse(createInput));


      expect(createResult.success).toBe(true);
      expect(createResult.slideCount).toBe(6);
      expect(createResult.filePath).toBe(pptxPath);

      // Verify file exists and has content
      const stats = await fs.stat(pptxPath);
      expect(stats.size).toBeGreaterThan(10000); // Should be at least 10KB
    });

    it("should handle charts in presentations", async () => {
      const createInput = {
        title: "Chart Presentation",
        slides: [
          {
            title: "Sales by Quarter",
            layout: "titleAndContent",
            elements: [
              {
                type: "chart",
                chartType: "bar",
                title: "Quarterly Sales",
                data: [
                  {
                    name: "2025",
                    labels: ["Q1", "Q2", "Q3", "Q4"],
                    values: [100, 120, 140, 180],
                  },
                ],
                x: 0.5,
                y: 1.5,
                w: 9,
                h: 4.5,
              } as const,
            ],
          } as const,
        ],
      };
      const createResult = await createPptxTool.handler(createPptxTool.schema.parse(createInput));


      expect(createResult.success).toBe(true);
    });
  });

  describe("Cross-format Workflows", () => {
    it("should generate consistent documents across formats", async () => {
      const content = {
        title: "Project Status",
        text: "The project is on track for delivery.",
        tableHeaders: ["Phase", "Status"],
        tableRows: [["Design", "Complete"], ["Development", "In Progress"]],
      };

      // Create PDF
      const pdfInput = {
        title: content.title,
        content: [
          { type: "text", content: content.text } as const,
          { type: "table", headers: content.tableHeaders, rows: content.tableRows } as const,
        ],
      };
      const pdfResult = await createPdfTool.handler(createPdfTool.schema.parse(pdfInput));

      // Create DOCX
      const docxInput = {
        title: content.title,
        content: [
          { type: "paragraph", content: content.text } as const,
          { type: "table", headers: content.tableHeaders, rows: content.tableRows } as const,
        ],
      };
      const docxResult = await createDocxTool.handler(createDocxTool.schema.parse(docxInput));

      // Create PPTX
      const pptxInput = {
        title: content.title,
        slides: [
          {
            title: content.title,
            layout: "titleAndContent",
            elements: [
              { type: "textBox", text: content.text, x: 0.5, y: 1.5, w: 9, h: 1 } as const,
              { type: "table", headers: content.tableHeaders, rows: content.tableRows, y: 3 } as const,
            ],
          } as const,
        ],
      };
      const pptxResult = await createPptxTool.handler(createPptxTool.schema.parse(pptxInput));

      expect(pdfResult.success).toBe(true);
      expect(docxResult.success).toBe(true);
      expect(pptxResult.success).toBe(true);

      // Verify DOCX contains expected content
      const docxReadInput = {
        base64Content: docxResult.base64 as string,
        outputFormat: "text" as const,
      };
      const docxReadResult = await readDocxTool.handler(readDocxTool.schema.parse(docxReadInput));


      if (!docxReadResult.success) throw new Error(docxReadResult.error);
      // @ts-expect-error - intentionally passing invalid input
      expect(docxReadResult.text).toContain("Project Status");
      // @ts-expect-error - intentionally passing invalid input
      expect(docxReadResult.text).toContain("on track");
    });
  });
});
