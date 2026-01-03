// Re-export tools with full metadata
import createPdfHandler, { schema as createPdfSchema, metadata as createPdfMetadata } from "./tools/create-pdf";
export const createPdf = { handler: createPdfHandler, schema: createPdfSchema, ...createPdfMetadata };

import createDocxHandler, { schema as createDocxSchema, metadata as createDocxMetadata } from "./tools/create-docx";
export const createDocx = { handler: createDocxHandler, schema: createDocxSchema, ...createDocxMetadata };

import createPptxHandler, { schema as createPptxSchema, metadata as createPptxMetadata } from "./tools/create-pptx";
export const createPptx = { handler: createPptxHandler, schema: createPptxSchema, ...createPptxMetadata };

import readPdfHandler, { schema as readPdfSchema, metadata as readPdfMetadata } from "./tools/read-pdf";
export const readPdf = { handler: readPdfHandler, schema: readPdfSchema, ...readPdfMetadata };

import readDocxHandler, { schema as readDocxSchema, metadata as readDocxMetadata } from "./tools/read-docx";
export const readDocx = { handler: readDocxHandler, schema: readDocxSchema, ...readDocxMetadata };

import readPptxHandler, { schema as readPptxSchema, metadata as readPptxMetadata } from "./tools/read-pptx";
export const readPptx = { handler: readPptxHandler, schema: readPptxSchema, ...readPptxMetadata };

export { analyzeDocument } from "./lib/ai";
