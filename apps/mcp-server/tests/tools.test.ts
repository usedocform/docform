import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { callTool, type McpToolContext } from "../src/tools.js";

const templatesRoot = path.resolve(process.cwd(), "packages/templates-basic/templates");

describe("DocForm MCP tools", () => {
  it("generates a non-empty DOCX through the core pipeline", async () => {
    const context = await createTestContext();
    const result = await callTool(
      "generate_document",
      {
        content_markdown: "# MCP DOCX\n\nGenerated from MCP.",
        template: "minimal",
        format: "docx"
      },
      context
    );

    expect(result.status).toBe("completed");
    expect(result.format).toBe("docx");
    expect(result.file_path).toEqual(expect.stringMatching(/\.docx$/));

    const output = await stat(path.resolve(context.cwd, result.file_path as string));
    expect(output.size).toBeGreaterThan(0);
  });

  it("returns HTML preview", async () => {
    const context = await createTestContext();
    const result = await callTool(
      "preview_document",
      {
        content_markdown: "# MCP Preview\n\nHello.",
        template: "minimal"
      },
      context
    );

    expect(result.status).toBe("completed");
    expect(result.format).toBe("html");
    expect(result.html).toContain("<h1>MCP Preview</h1>");
  });

  it("lists templates from the registry", async () => {
    const context = await createTestContext();
    const result = await callTool("list_templates", {}, context);

    expect(result.templates).toContainEqual(
      expect.objectContaining({
        id: "minimal",
        formats: expect.arrayContaining(["pdf", "html", "docx"])
      })
    );
  });

  it("returns template metadata from the registry", async () => {
    const context = await createTestContext();
    const result = await callTool("get_template", { template: "minimal" }, context);

    expect(result).toMatchObject({
      id: "minimal",
      name: "Minimal",
      source: "basic"
    });
  });

  it("rejects invalid tool input", async () => {
    const context = await createTestContext();

    await expect(
      callTool(
        "generate_document",
        {
          content_markdown: "# MCP",
          format: "txt"
        },
        context
      )
    ).rejects.toThrow("Unsupported output format");
  });
});

async function createTestContext(): Promise<McpToolContext> {
  const outputRoot = await mkdtemp(path.join(tmpdir(), "docform-mcp-"));

  return {
    cwd: process.cwd(),
    templatesRoot,
    outputRoot
  };
}
