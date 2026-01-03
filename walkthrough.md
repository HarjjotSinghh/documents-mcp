# Document MCP Implementation Walkthrough

This document outlines the implementation of the Documents MCP server, its capabilities, and how to build, test, and publish it.

## Project Overview

The **Documents MCP** is a Model Context Protocol server that provides tools for:
- **Creating Documents**: Generate PDF, DOCX, and PPTX files from structured data.
- **Reading Documents**: Extract text and metadata from PDF, DOCX, and PPTX files.
- **AI Analysis**: Use Google Gemini to analyze document content (summarization, insight extraction) directly.

## Key Features Implemented

1.  **Dual Publishing Support**:
    -   **npm**: Standard Node.js package publishing (`documents-mcp`).
    -   **JSR**: Modern JavaScript Registry publishing (`@harjjotsinghh/documents-mcp`).

2.  **Robust Tooling**:
    -   `create-pdf`: Uses `pdf-lib` for generation.
    -   `create-docx`: Uses `docx` library.
    -   `create-pptx`: Uses `pptxgenjs`.
    -   `read-pdf`: Uses `pdf-parse`.
    -   `read-docx`: Uses `mammoth`.
    -   `read-pptx`: Custom XML parsing for slide content.

3.  **AI Integration**:
    -   Integrated `analyzeDocument` function using `@google/generative-ai`.
    -   Tools support an optional `prompt` argument to trigger AI analysis on the read content.

4.  **Executable Scripts**:
    -   Built-in shebang support (`#!/usr/bin/env node`) for `dist/stdio.js` and `dist/http.js`.
    -   Allows running directly via `npx documents-mcp` or `npx @harjjotsinghh/documents-mcp`.

5.  **Comprehensive Testing**:
    -   **Unit Tests**: Validate individual tool logic and schema parsing.
    -   **Integration Tests**: Verify workflows (Create -> Read) and cross-format consistency.
    -   **E2E Tests**: Validate the MCP server binary execution and environment variable handling.

## Usage Guide

### Running Locally

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run the STDIO server
npm run start:stdio
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Publishing

#### To JSR

The project is configured for JSR.
1.  Ensure `jsr.json` mentions `@harjjotsinghh/documents-mcp`.
2.  Run:
    ```bash
    npx jsr publish --allow-slow-types
    ```

#### To npm

1.  Ensure `package.json` version is updated.
2.  Build the project (includes `tsc` for library files):
    ```bash
    npm run build
    ```
3.  Publish:
    ```bash
    npm publish --access public
    ```

## CLI Usage

Run the server directly without installing:

```bash
# From JSR
npx @harjjotsinghh/documents-mcp

# From npm
npx documents-mcp
```

## Configuration

-   `GOOGLE_API_KEY`: Required for AI analysis features.
-   `OUTPUT_DIR`: Optional. Directory to save generated files. If not set, files are returned as Base64.
