import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
  AlignmentType,
  BorderStyle,
} from "docx";
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
 * Schema for text content
 */
const TextContentSchema = z.object({
  type: z.literal("text"),
  content: z.string(),
  bold: z.boolean().optional().default(false),
  italic: z.boolean().optional().default(false),
  underline: z.boolean().optional().default(false),
  fontSize: z.number().optional().default(24), // in half-points (24 = 12pt)
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
 * Schema for paragraph content
 */
const ParagraphContentSchema = z.object({
  type: z.literal("paragraph"),
  content: z.string(),
  alignment: z.enum(["left", "center", "right", "justified"]).optional().default("left"),
});

/**
 * Schema for bullet list
 */
const BulletListSchema = z.object({
  type: z.literal("bulletList"),
  items: z.array(z.string()),
});

/**
 * Schema for numbered list
 */
const NumberedListSchema = z.object({
  type: z.literal("numberedList"),
  items: z.array(z.string()),
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
  width: z.number().optional().default(400),
  height: z.number().optional().default(300),
  altText: z.string().optional().default("Image"),
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
  ParagraphContentSchema,
  BulletListSchema,
  NumberedListSchema,
  TableContentSchema,
  ImageContentSchema,
  PageBreakSchema,
]);

/**
 * Tool input schema
 */
export const name = "create-docx";
export const schema = z.object({
  title: z.string().describe("The title of the DOCX document"),
  author: z.string().optional().describe("The author of the document"),
  content: z.array(ContentItemSchema).describe("Array of content items to include in the document"),
  outputPath: z
    .string()
    .optional()
    .describe("Optional file path to save the DOCX. If not provided, returns base64"),
});

export const description =
  "Create a DOCX (Word) document with text, headings, lists, tables, and images";

type ContentItem = z.infer<typeof ContentItemSchema>;

/**
 * Get heading level enum
 */
function getHeadingLevel(level: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  const levels: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6,
  };
  return levels[level] || HeadingLevel.HEADING_1;
}

/**
 * Get alignment enum
 */
function getAlignment(
  alignment: string
): (typeof AlignmentType)[keyof typeof AlignmentType] {
  const alignments: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justified: AlignmentType.JUSTIFIED,
  };
  return alignments[alignment] || AlignmentType.LEFT;
}

/**
 * Main tool handler
 */
export default async function handler(input: z.infer<typeof schema>) {
  const outputDir = getOutputDir();
  const { title, author, content, outputPath } = input;

  const children: (Paragraph | Table)[] = [];

  // Add title
  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 },
    })
  );

  // Process content items
  for (const item of content) {
    switch (item.type) {
      case "text": {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: item.content,
                bold: item.bold,
                italics: item.italic,
                underline: item.underline ? {} : undefined,
                size: item.fontSize,
              }),
            ],
          })
        );
        break;
      }

      case "heading": {
        children.push(
          new Paragraph({
            text: item.content,
            heading: getHeadingLevel(item.level),
            spacing: { before: 240, after: 120 },
          })
        );
        break;
      }

      case "paragraph": {
        children.push(
          new Paragraph({
            text: item.content,
            alignment: getAlignment(item.alignment),
            spacing: { after: 200 },
          })
        );
        break;
      }

      case "bulletList": {
        for (const listItem of item.items) {
          children.push(
            new Paragraph({
              text: listItem,
              bullet: { level: 0 },
            })
          );
        }
        break;
      }

      case "numberedList": {
        for (let i = 0; i < item.items.length; i++) {
          children.push(
            new Paragraph({
              text: item.items[i],
              numbering: { reference: "default-numbering", level: 0 },
            })
          );
        }
        break;
      }

      case "table": {
        const tableRows: TableRow[] = [];

        // Header row
        tableRows.push(
          new TableRow({
            children: item.headers.map(
              (header) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: header, bold: true })],
                    }),
                  ],
                  shading: { fill: "E0E0E0" },
                })
            ),
          })
        );

        // Data rows
        for (const row of item.rows) {
          tableRows.push(
            new TableRow({
              children: row.map(
                (cell) =>
                  new TableCell({
                    children: [new Paragraph({ text: cell })],
                  })
              ),
            })
          );
        }

        children.push(
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
              insideVertical: { style: BorderStyle.SINGLE, size: 1 },
            },
          })
        );
        children.push(new Paragraph({ text: "" })); // Spacing after table
        break;
      }

      case "image": {
        try {
          const imageBuffer = Buffer.from(item.base64, "base64");
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  type: "png",
                  data: imageBuffer,
                  transformation: {
                    width: item.width,
                    height: item.height,
                  },
                  altText: {
                    title: item.altText,
                    description: item.altText,
                    name: item.altText,
                  },
                }),
              ],
              spacing: { after: 200 },
            })
          );
        } catch {
          children.push(
            new Paragraph({
              text: "[Image could not be embedded]",
              style: "Caption",
            })
          );
        }
        break;
      }

      case "pageBreak": {
        children.push(new Paragraph({ pageBreakBefore: true }));
        break;
      }
    }
  }

  const doc = new Document({
    creator: author || "Documents MCP",
    title,
    description: `Document created by Documents MCP`,
    numbering: {
      config: [
        {
          reference: "default-numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  if (outputPath) {
    const fullPath = path.isAbsolute(outputPath)
      ? outputPath
      : path.join(outputDir, outputPath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);

    return {
      success: true,
      message: "DOCX created successfully",
      filePath: fullPath,
    };
  }

  return {
    success: true,
    message: "DOCX created successfully",
    base64: buffer.toString("base64"),
  };
}

export const metadata = {
  name,
  description,
};
