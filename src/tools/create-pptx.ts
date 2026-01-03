import PptxGenJS from "pptxgenjs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import process from "node:process";
import { z } from "zod";

/**
 * Get output directory from environment
 */
function getOutputDir(): string {
  return process.env.OUTPUT_DIR || process.cwd();
}

/**
 * Schema for text box content
 */
const TextBoxSchema = z.object({
  type: z.literal("textBox"),
  text: z.string(),
  x: z.number().optional().default(0.5),
  y: z.number().optional().default(0.5),
  w: z.number().optional().default(9),
  h: z.number().optional().default(1),
  fontSize: z.number().optional().default(18),
  bold: z.boolean().optional().default(false),
  color: z.string().optional().default("000000"),
  align: z.enum(["left", "center", "right"]).optional().default("left"),
});

/**
 * Schema for image content
 */
const ImageSchema = z.object({
  type: z.literal("image"),
  base64: z.string(),
  x: z.number().optional().default(1),
  y: z.number().optional().default(1.5),
  w: z.number().optional().default(8),
  h: z.number().optional().default(4.5),
});

/**
 * Schema for shape content
 */
const ShapeSchema = z.object({
  type: z.literal("shape"),
  shapeType: z
    .enum(["rect", "ellipse", "triangle", "line", "arrow"])
    .default("rect"),
  x: z.number().optional().default(1),
  y: z.number().optional().default(1),
  w: z.number().optional().default(2),
  h: z.number().optional().default(2),
  fill: z.string().optional().default("0088CC"),
  line: z.string().optional(),
});

/**
 * Schema for table content
 */
const TableSchema = z.object({
  type: z.literal("table"),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  x: z.number().optional().default(0.5),
  y: z.number().optional().default(1.5),
  w: z.number().optional().default(9),
});

/**
 * Schema for chart content
 */
const ChartSchema = z.object({
  type: z.literal("chart"),
  chartType: z.enum(["bar", "line", "pie", "doughnut"]).default("bar"),
  title: z.string().optional(),
  data: z.array(
    z.object({
      name: z.string(),
      labels: z.array(z.string()),
      values: z.array(z.number()),
    })
  ),
  x: z.number().optional().default(0.5),
  y: z.number().optional().default(1.5),
  w: z.number().optional().default(9),
  h: z.number().optional().default(5),
});

/**
 * Combined slide element schema
 */
const SlideElementSchema = z.discriminatedUnion("type", [
  TextBoxSchema,
  ImageSchema,
  ShapeSchema,
  TableSchema,
  ChartSchema,
]);

/**
 * Schema for a slide
 */
const SlideSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  layout: z
    .enum(["title", "titleAndContent", "blank", "sectionHeader"])
    .optional()
    .default("titleAndContent"),
  elements: z.array(SlideElementSchema).optional().default([]),
  backgroundColor: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Tool input schema
 */
export const name = "create-pptx";
export const schema = z.object({
  title: z.string().describe("The title of the presentation"),
  author: z.string().optional().describe("The author of the presentation"),
  subject: z.string().optional().describe("The subject of the presentation"),
  slides: z.array(SlideSchema).describe("Array of slides to include in the presentation"),
  outputPath: z
    .string()
    .optional()
    .describe("Optional file path to save the PPTX. If not provided, returns base64"),
});

export const description =
  "Create a PPTX (PowerPoint) presentation with slides, text, images, shapes, tables, and charts";

type SlideElement = z.infer<typeof SlideElementSchema>;

/**
 * Map shape type string to shape name
 */
function getShapeName(shapeType: string): string {
  const types: Record<string, string> = {
    rect: "rect",
    ellipse: "ellipse",
    triangle: "triangle",
    line: "line",
    arrow: "rightArrow",
  };
  return types[shapeType] || "rect";
}

// Use any type to work around pptxgenjs TypeScript issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SlideType = any;

/**
 * Add elements to a slide
 */
function addElementsToSlide(slide: SlideType, elements: SlideElement[]) {
  for (const element of elements) {
    switch (element.type) {
      case "textBox": {
        slide.addText(element.text, {
          x: element.x,
          y: element.y,
          w: element.w,
          h: element.h,
          fontSize: element.fontSize,
          bold: element.bold,
          color: element.color,
          align: element.align,
        });
        break;
      }

      case "image": {
        try {
          slide.addImage({
            data: `data:image/png;base64,${element.base64}`,
            x: element.x,
            y: element.y,
            w: element.w,
            h: element.h,
          });
        } catch {
          slide.addText("[Image could not be added]", {
            x: element.x,
            y: element.y,
            fontSize: 12,
            color: "999999",
          });
        }
        break;
      }

      case "shape": {
        slide.addShape(getShapeName(element.shapeType), {
          x: element.x,
          y: element.y,
          w: element.w,
          h: element.h,
          fill: { color: element.fill },
          line: element.line ? { color: element.line } : undefined,
        });
        break;
      }

      case "table": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableData: any[][] = [];

        // Header row
        tableData.push(
          element.headers.map((header) => ({
            text: header,
            options: {
              bold: true,
              fill: { color: "E0E0E0" },
              border: { pt: 1, color: "CCCCCC" },
            },
          }))
        );

        // Data rows
        for (const row of element.rows) {
          tableData.push(
            row.map((cell) => ({
              text: cell,
              options: { border: { pt: 1, color: "CCCCCC" } },
            }))
          );
        }

        slide.addTable(tableData, {
          x: element.x,
          y: element.y,
          w: element.w,
          colW: element.w / element.headers.length,
        });
        break;
      }

      case "chart": {
        const chartData = element.data.map((series) => ({
          name: series.name,
          labels: series.labels,
          values: series.values,
        }));

        slide.addChart(element.chartType, chartData, {
          x: element.x,
          y: element.y,
          w: element.w,
          h: element.h,
          title: element.title,
          showLegend: true,
          legendPos: "b",
        });
        break;
      }
    }
  }
}

/**
 * Main tool handler
 */
export default async function handler(input: z.infer<typeof schema>) {
  const outputDir = getOutputDir();
  const { title, author, subject, slides, outputPath } = input;

  // Create presentation instance using default export
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PptxGen = PptxGenJS as any;
  const pptx = new PptxGen();

  // Set presentation metadata
  pptx.title = title;
  if (author) pptx.author = author;
  if (subject) pptx.subject = subject;
  pptx.company = "Documents MCP";

  // Process slides
  for (const slideData of slides) {
    const slide = pptx.addSlide();

    // Set background color if specified
    if (slideData.backgroundColor) {
      slide.background = { color: slideData.backgroundColor };
    }

    // Add slide notes
    if (slideData.notes) {
      slide.addNotes(slideData.notes);
    }

    // Add title and subtitle based on layout
    if (slideData.layout === "title" || slideData.layout === "sectionHeader") {
      if (slideData.title) {
        slide.addText(slideData.title, {
          x: 0.5,
          y: 2.5,
          w: 9,
          h: 1.5,
          fontSize: 44,
          bold: true,
          align: "center",
          color: "363636",
        });
      }
      if (slideData.subtitle) {
        slide.addText(slideData.subtitle, {
          x: 0.5,
          y: 4,
          w: 9,
          h: 1,
          fontSize: 24,
          align: "center",
          color: "666666",
        });
      }
    } else if (slideData.layout === "titleAndContent") {
      if (slideData.title) {
        slide.addText(slideData.title, {
          x: 0.5,
          y: 0.3,
          w: 9,
          h: 1,
          fontSize: 32,
          bold: true,
          color: "363636",
        });
      }
    }

    // Add elements
    if (slideData.elements) {
      addElementsToSlide(slide, slideData.elements);
    }
  }

  // Handle title slide if no slides provided
  if (slides.length === 0) {
    const titleSlide = pptx.addSlide();
    titleSlide.addText(title, {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 1.5,
      fontSize: 44,
      bold: true,
      align: "center",
      color: "363636",
    });
    if (author) {
      titleSlide.addText(`By ${author}`, {
        x: 0.5,
        y: 4,
        w: 9,
        h: 1,
        fontSize: 24,
        align: "center",
        color: "666666",
      });
    }
  }

  if (outputPath) {
    const fullPath = path.isAbsolute(outputPath)
      ? outputPath
      : path.join(outputDir, outputPath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await pptx.writeFile({ fileName: fullPath });

    return {
      success: true,
      message: "PPTX created successfully",
      filePath: fullPath,
      slideCount: slides.length || 1,
    };
  }

  const base64 = await pptx.write({ outputType: "base64" });

  return {
    success: true,
    message: "PPTX created successfully",
    base64: base64 as string,
    slideCount: slides.length || 1,
  };
}

export const metadata = {
  name,
  description,
};
