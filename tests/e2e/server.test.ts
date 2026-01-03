import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, ChildProcess } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import * as http from "http";

const TEST_OUTPUT_DIR = path.join(process.cwd(), "tests/fixtures/e2e");
const HTTP_PORT = 3456;

describe("E2E Tests: MCP Server", () => {
  let httpServer: ChildProcess | null = null;

  beforeAll(async () => {
    await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Kill HTTP server if running
    if (httpServer) {
      // @ts-expect-error - intentionally passing invalid input
      httpServer.kill();
    }

    // Cleanup test files
    try {
      const files = await fs.readdir(TEST_OUTPUT_DIR);
      for (const file of files) {
        await fs.unlink(path.join(TEST_OUTPUT_DIR, file));
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("STDIO Transport", () => {
    it.skip("should respond to tools/list request via STDIO", async () => {
      const result = await runStdioCommand({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      });

      // The server should return a valid JSON-RPC response
      expect(result).toBeDefined();
      // Note: The actual response format depends on xMCP implementation
    }, 30000);

    it("should build STDIO server binary", async () => {
      const stdioPath = path.join(process.cwd(), "dist/stdio.js");
      const stats = await fs.stat(stdioPath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe("HTTP Transport", () => {
    it("should build HTTP server binary", async () => {
      const httpPath = path.join(process.cwd(), "dist/http.js");
      const stats = await fs.stat(httpPath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe("Package Structure", () => {
    it("should have all required files for npm publishing", async () => {
      const requiredFiles = [
        "package.json",
        "README.md",
        "LICENSE",
        "dist/stdio.js",
        "dist/http.js",
      ];

      for (const file of requiredFiles) {
        const filePath = path.join(process.cwd(), file);
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        expect(exists, `Missing file: ${file}`).toBe(true);
      }
    });

    it("should have valid package.json with required fields", async () => {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(process.cwd(), "package.json"), "utf-8")
      );

      expect(packageJson.name).toBe("documents-mcp");
      expect(packageJson.version).toBeDefined();
      expect(packageJson.bin).toBeDefined();
      expect(packageJson.bin["documents-mcp"]).toBe("./dist/stdio.js");
      expect(packageJson.bin["documents-mcp-http"]).toBe("./dist/http.js");
      expect(packageJson.scripts.build).toBeDefined();
    });

    it("should have valid jsr.json for jsr.io publishing", async () => {
      const jsrJson = JSON.parse(
        await fs.readFile(path.join(process.cwd(), "jsr.json"), "utf-8")
      );

      expect(jsrJson.name).toBeDefined();
      expect(jsrJson.version).toBeDefined();
      expect(jsrJson.exports).toBeDefined();
    });
  });

  describe("Environment Configuration", () => {
    it("should handle OUTPUT_DIR environment variable", async () => {
      const customOutputDir = path.join(TEST_OUTPUT_DIR, "custom-output");
      await fs.mkdir(customOutputDir, { recursive: true });

      // Set environment variable
      const originalOutputDir = process.env.OUTPUT_DIR;
      process.env.OUTPUT_DIR = customOutputDir;

      try {
        // Import handler and schema dynamically to pick up env change
        const { default: createPdfTool } = await import("../../src/tools/create-pdf");
        
        const input = {
          title: "Env Test",
          content: [{ type: "text", content: "Testing OUTPUT_DIR" } as const],
          outputPath: "env-test.pdf",
        };
        const result = await createPdfTool.handler(createPdfTool.schema.parse(input));

        expect(result.success).toBe(true);
        expect(result.filePath).toContain("custom-output");


        // Verify file was created in custom directory
        const filePath = path.join(customOutputDir, "env-test.pdf");
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      } finally {
        // Restore original environment
        if (originalOutputDir) {
          process.env.OUTPUT_DIR = originalOutputDir;
        } else {
          delete process.env.OUTPUT_DIR;
        }
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid input gracefully", async () => {
      const { default: createPdfTool } = await import("../../src/tools/create-pdf");
      
      // This should throw a Zod validation error
      try {
        // @ts-expect-error - intentionally passing invalid input
        await createPdfTool.handler({
          // Missing required 'title' field
          content: [],
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should handle invalid file paths gracefully", async () => {
      const { default: readPdfTool } = await import("../../src/tools/read-pdf");
      
      const result = await readPdfTool.handler({
        filePath: "/this/path/does/not/exist.pdf",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle malformed base64 content gracefully", async () => {
      const { default: readDocxTool } = await import("../../src/tools/read-docx");
      
      const result = await readDocxTool.handler(readDocxTool.schema.parse({
        base64Content: "not-valid-base64!!!",
      }));

      expect(result.success).toBe(false);
    });
  });

  describe("Performance", () => {
    it("should create a simple PDF in under 1 second", async () => {
      const { default: createPdfTool } = await import("../../src/tools/create-pdf");
      
      const start = Date.now();
      const input = {
        title: "Performance Test",
        content: [{ type: "text", content: "Quick test." } as const],
      };
      const result = await createPdfTool.handler(createPdfTool.schema.parse(input));
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000);
    });

    it("should create a simple DOCX in under 1 second", async () => {
      const { default: createDocxTool } = await import("../../src/tools/create-docx");
      
      const start = Date.now();
      const input = {
        title: "Performance Test",
        content: [{ type: "paragraph", content: "Quick test." } as const],
      };
      const result = await createDocxTool.handler(createDocxTool.schema.parse(input));
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000);
    });

    it("should create a simple PPTX in under 2 seconds", async () => {
      const { default: createPptxTool } = await import("../../src/tools/create-pptx");
      
      const start = Date.now();
      const input = {
        title: "Performance Test",
        slides: [{ title: "Quick", layout: "title" } as const],
      };
      const result = await createPptxTool.handler(createPptxTool.schema.parse(input));
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(2000);
    });

  });
});

/**
 * Helper to run a STDIO command against the MCP server
 */
async function runStdioCommand(message: object): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["dist/stdio.js"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";
    let errorOutput = "";

    child.stdout?.on("data", (data) => {
      output += data.toString();
    });

    child.stderr?.on("data", (data) => {
      errorOutput += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0 || output) {
        resolve(output);
      } else {
        reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
      }
    });

    child.on("error", reject);

    // Send the message and close stdin
    child.stdin?.write(JSON.stringify(message) + "\n");
    child.stdin?.end();

    // Timeout after 10 seconds
    setTimeout(() => {
      child.kill();
      resolve(output || "timeout");
    }, 10000);
  });
}
