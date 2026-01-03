import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Buffer } from "node:buffer";
import process from "node:process";
import { z } from "zod";

/**
 * Get output directory from environment
 */
function getOutputDir(): string {
  return process.env.OUTPUT_DIR || process.cwd();
}

/**
 * Schema for text content in a PDF
 */
const TextContentSchema = z.object({
  type: z.literal("text"),
  content: z.string(),
  fontSize: z.number().optional().default(12),
  bold: z.boolean().optional().default(false),
  color: z
    .object({
      r: z.number().min(0).max(1),
      g: z.number().min(0).max(1),
      b: z.number().min(0).max(1),
    })
    .optional(),
});

/**
 * Schema for heading content
 */
const HeadingContentSchema = z.object({
  type: z.literal("heading"),
  content: z.string(),
  level: z.number().min(1).max(6).default(1),
});

/**
 * Schema for table content
 */
const TableContentSchema = z.object({
  type: z.literal("table"),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

/**
 * Schema for image content
 */
const ImageContentSchema = z.object({
  type: z.literal("image"),
  base64: z.string(),
  format: z.enum(["png", "jpg", "jpeg"]),
  width: z.number().optional(),
  height: z.number().optional(),
});

/**
 * Schema for page break
 */
const PageBreakSchema = z.object({
  type: z.literal("pageBreak"),
});

/**
 * Combined content schema
 */
const ContentItemSchema = z.discriminatedUnion("type", [
  TextContentSchema,
  HeadingContentSchema,
  TableContentSchema,
  ImageContentSchema,
  PageBreakSchema,
]);

/**
 * Tool input schema
 */
export const name = "create-pdf";
export const schema = z.object({
  title: z.string().describe("The title of the PDF document"),
  author: z.string().optional().describe("The author of the document"),
  content: z.array(ContentItemSchema).describe("Array of content items to include in the PDF"),
  outputPath: z
    .string()
    .optional()
    .describe("Optional file path to save the PDF. If not provided, returns base64"),
  pageSize: z
    .enum(["A4", "Letter", "Legal"])
    .optional()
    .default("A4")
    .describe("Page size for the document"),
});

export const description = "Create a PDF document with text, headings, tables, and images";

type ContentItem = z.infer<typeof ContentItemSchema>;

/**
 * Get page dimensions based on page size
 */
function getPageDimensions(pageSize: string): { width: number; height: number } {
  const sizes: Record<string, { width: number; height: number }> = {
    A4: { width: 595.28, height: 841.89 },
    Letter: { width: 612, height: 792 },
    Legal: { width: 612, height: 1008 },
  };
  return sizes[pageSize] || sizes.A4;
}

/**
 * Get heading font size based on level
 */
function getHeadingSize(level: number): number {
  const sizes: Record<number, number> = {
    1: 24,
    2: 20,
    3: 18,
    4: 16,
    5: 14,
    6: 12,
  };
  return sizes[level] || 12;
}

/**
 * Draw a table on the PDF page
 */
function drawTable(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  headers: string[],
  rows: string[][],
  startY: number,
  pageWidth: number,
  margin: number
): number {
  const cellPadding = 5;
  const rowHeight = 20;
  const tableWidth = pageWidth - 2 * margin;
  const cellWidth = tableWidth / headers.length;

  let y = startY;

  // Draw headers
  headers.forEach((header, i) => {
    const x = margin + i * cellWidth;
    page.drawRectangle({
      x,
      y: y - rowHeight,
      width: cellWidth,
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(0.9, 0.9, 0.9),
    });
    page.drawText(header, {
      x: x + cellPadding,
      y: y - rowHeight + cellPadding,
      size: 10,
      font: boldFont,
    });
  });
  y -= rowHeight;

  // Draw rows
  for (const row of rows) {
    row.forEach((cell, i) => {
      const x = margin + i * cellWidth;
      page.drawRectangle({
        x,
        y: y - rowHeight,
        width: cellWidth,
        height: rowHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      page.drawText(cell.substring(0, 30), {
        x: x + cellPadding,
        y: y - rowHeight + cellPadding,
        size: 9,
        font,
      });
    });
    y -= rowHeight;
  }

  return y - 10;
}

/**
 * Main tool handler
 */
export default async function handler(input: z.infer<typeof schema>) {
  const outputDir = getOutputDir();
  const { title, author, content, outputPath, pageSize } = input;

  const pdfDoc = await PDFDocument.create();

  // Set document metadata
  pdfDoc.setTitle(title);
  if (author) pdfDoc.setAuthor(author);
  pdfDoc.setCreator("Documents MCP");
  pdfDoc.setCreationDate(new Date());

  const dimensions = getPageDimensions(pageSize);
  const margin = 50;
  let page = pdfDoc.addPage([dimensions.width, dimensions.height]);
  let y = dimensions.height - margin;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Add title
  page.drawText(title, {
    x: margin,
    y,
    size: 28,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 40;

  // Process content items
  for (const item of content) {
    // Check if we need a new page
    if (y < margin + 50) {
      page = pdfDoc.addPage([dimensions.width, dimensions.height]);
      y = dimensions.height - margin;
    }

    switch (item.type) {
      case "text": {
        const textFont = item.bold ? boldFont : font;
        const textColor = item.color ? rgb(item.color.r, item.color.g, item.color.b) : rgb(0, 0, 0);

        // Split text into lines for wrapping
        const maxWidth = dimensions.width - 2 * margin;
        const words = item.content.split(" ");
        let line = "";

        for (const word of words) {
          const testLine = line + (line ? " " : "") + word;
          const testWidth = textFont.widthOfTextAtSize(testLine, item.fontSize);

          if (testWidth > maxWidth && line) {
            page.drawText(line, {
              x: margin,
              y,
              size: item.fontSize,
              font: textFont,
              color: textColor,
            });
            y -= item.fontSize + 4;
            line = word;

            if (y < margin) {
              page = pdfDoc.addPage([dimensions.width, dimensions.height]);
              y = dimensions.height - margin;
            }
          } else {
            line = testLine;
          }
        }

        if (line) {
          page.drawText(line, {
            x: margin,
            y,
            size: item.fontSize,
            font: textFont,
            color: textColor,
          });
          y -= item.fontSize + 8;
        }
        break;
      }

      case "heading": {
        const headingSize = getHeadingSize(item.level);
        page.drawText(item.content, {
          x: margin,
          y,
          size: headingSize,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        y -= headingSize + 12;
        break;
      }

      case "table": {
        y = drawTable(
          page,
          font,
          boldFont,
          item.headers,
          item.rows,
          y,
          dimensions.width,
          margin
        );
        break;
      }

      case "image": {
        try {
          const imageBytes = Buffer.from(item.base64, "base64");
          let image;

          if (item.format === "png") {
            image = await pdfDoc.embedPng(imageBytes);
          } else {
            image = await pdfDoc.embedJpg(imageBytes);
          }

          const imgWidth = item.width || Math.min(image.width, dimensions.width - 2 * margin);
          const imgHeight = item.height || (image.height * imgWidth) / image.width;

          if (y - imgHeight < margin) {
            page = pdfDoc.addPage([dimensions.width, dimensions.height]);
            y = dimensions.height - margin;
          }

          page.drawImage(image, {
            x: margin,
            y: y - imgHeight,
            width: imgWidth,
            height: imgHeight,
          });
          y -= imgHeight + 10;
        } catch {
          // Skip invalid images
          page.drawText("[Image could not be embedded]", {
            x: margin,
            y,
            size: 10,
            font,
            color: rgb(0.5, 0.5, 0.5),
          });
          y -= 20;
        }
        break;
      }

      case "pageBreak": {
        page = pdfDoc.addPage([dimensions.width, dimensions.height]);
        y = dimensions.height - margin;
        break;
      }
    }
  }

  // Add page numbers
  const pages = pdfDoc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Page ${i + 1} of ${pages.length}`, {
      x: dimensions.width / 2 - 30,
      y: 20,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  });

  const pdfBytes = await pdfDoc.save();

  if (outputPath) {
    const fullPath = path.isAbsolute(outputPath)
      ? outputPath
      : path.join(outputDir, outputPath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, pdfBytes);

    return {
      success: true,
      message: `PDF created successfully`,
      filePath: fullPath,
      pageCount: pages.length,
    };
  }

  return {
    success: true,
    message: `PDF created successfully`,
    base64: Buffer.from(pdfBytes).toString("base64"),
    pageCount: pages.length,
  };
}

export const metadata = {
  name,
  description,
};
