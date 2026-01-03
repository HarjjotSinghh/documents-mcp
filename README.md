# Documents MCP

An MCP (Model Context Protocol) server that provides AI agents with tools to create and read PDF, DOCX, and PPTX documents.

## Features

- **Create PDF** - Generate PDF documents with text, headings, tables, images, and page numbers
- **Create DOCX** - Generate Word documents with headings, paragraphs, lists, tables, and images
- **Create PPTX** - Generate PowerPoint presentations with slides, text, shapes, tables, and charts
- **Read PDF** - Extract text content and metadata from PDF files (supports Gemini AI analysis)
- **Read DOCX** - Extract text and HTML content from Word documents (supports Gemini AI analysis)
- **Read PPTX** - Extract text content from PowerPoint presentations (supports Gemini AI analysis)

## Installation

```bash
npm install documents-mcp
```

Or use directly with npx:

```bash
npx documents-mcp
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`~/.config/claude/claude_desktop_config.json` on macOS/Linux or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "documents-mcp": {
      "command": "npx",
      "args": ["documents-mcp"],
      "env": {
        "OUTPUT_DIR": "/path/to/output/documents"
      }
    }
  }
}
```

## Environment Variables

All environment variables are optional. Configure only the providers you need:

### AI Provider API Keys

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GOOGLE_API_KEY` | Google AI API key |
| `GEMINI_API_KEY` | Gemini API key (alias for `GOOGLE_API_KEY`) |
| `PERPLEXITY_API_KEY` | Perplexity API key |
| `XAI_API_KEY` | xAI (Grok) API key |
| `GROQ_API_KEY` | Groq API key |

### Local Model Endpoints

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `LMSTUDIO_BASE_URL` | `http://localhost:1234` | LM Studio server URL |
| `VLLM_BASE_URL` | `http://localhost:8000` | vLLM server URL |

### Output Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OUTPUT_DIR` | Current directory | Default directory for saved documents |

## Tool Reference

### `create-pdf`

Create a PDF document with structured content.

**Parameters:**
- `title` (required): Document title
- `author` (optional): Document author
- `content` (required): Array of content items:
  - `{ type: "text", content: string, fontSize?: number, bold?: boolean, color?: {r, g, b} }`
  - `{ type: "heading", content: string, level: 1-6 }`
  - `{ type: "table", headers: string[], rows: string[][] }`
  - `{ type: "image", base64: string, format: "png"|"jpg"|"jpeg", width?: number, height?: number }`
  - `{ type: "pageBreak" }`
- `outputPath` (optional): File path to save the PDF
- `pageSize` (optional): "A4", "Letter", or "Legal"

### `create-docx`

Create a Word document with rich formatting.

**Parameters:**
- `title` (required): Document title
- `author` (optional): Document author
- `content` (required): Array of content items:
  - `{ type: "text", content: string, bold?: boolean, italic?: boolean, underline?: boolean }`
  - `{ type: "heading", content: string, level: 1-6 }`
  - `{ type: "paragraph", content: string, alignment?: "left"|"center"|"right"|"justified" }`
  - `{ type: "bulletList", items: string[] }`
  - `{ type: "numberedList", items: string[] }`
  - `{ type: "table", headers: string[], rows: string[][] }`
  - `{ type: "image", base64: string, width?: number, height?: number }`
  - `{ type: "pageBreak" }`
- `outputPath` (optional): File path to save the DOCX

### `create-pptx`

Create a PowerPoint presentation.

**Parameters:**
- `title` (required): Presentation title
- `author` (optional): Presentation author
- `slides` (required): Array of slide objects:
  - `title` (optional): Slide title
  - `subtitle` (optional): Slide subtitle
  - `layout`: "title", "titleAndContent", "blank", or "sectionHeader"
  - `elements`: Array of elements:
    - `{ type: "textBox", text: string, x?, y?, w?, h?, fontSize?, bold?, color?, align? }`
    - `{ type: "image", base64: string, x?, y?, w?, h? }`
    - `{ type: "shape", shapeType: "rect"|"ellipse"|"triangle"|"line"|"arrow", ... }`
    - `{ type: "table", headers: string[], rows: string[][], x?, y?, w? }`
    - `{ type: "chart", chartType: "bar"|"line"|"pie"|"doughnut", data: [...], ... }`
  - `backgroundColor` (optional): Slide background color
  - `notes` (optional): Speaker notes
- `outputPath` (optional): File path to save the PPTX

### `read-pdf`

Extract text content from a PDF file.

**Parameters:**
- `filePath` (optional): Path to the PDF file
- `base64Content` (optional): Base64-encoded PDF content
- `prompt` (optional): Instruction for AI analysis (requires `GOOGLE_API_KEY`)

**Returns:** `{ text, metadata: { pageCount, info, version }, characterCount, wordCount, aiAnalysis? }`

### `read-docx`

Extract text content from a Word document.

**Parameters:**
- `filePath` (optional): Path to the DOCX file
- `base64Content` (optional): Base64-encoded DOCX content
- `outputFormat` (optional): "text", "html", or "both"
- `prompt` (optional): Instruction for AI analysis (requires `GOOGLE_API_KEY`)

**Returns:** `{ text?, html?, characterCount, wordCount, aiAnalysis? }`

### `read-pptx`

Extract text content from a PowerPoint presentation.

**Parameters:**
- `filePath` (optional): Path to the PPTX file
- `base64Content` (optional): Base64-encoded PPTX content
- `prompt` (optional): Instruction for AI analysis (requires `GOOGLE_API_KEY`)

**Returns:** `{ text, slideCount, slides: [{slide, text}], aiAnalysis? }`

## Running as HTTP Server

Start the HTTP server for web-based MCP clients:

```bash
npm run start:http
# or
npx documents-mcp-http
```

## Development

```bash
# Clone the repository
git clone https://github.com/HarjjotSinghh/documents-mcp.git
cd documents-mcp

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## License

MIT
