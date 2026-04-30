import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateDocumentFromMarkdown } from "../src/generate.js";

const templatesRoot = path.resolve(process.cwd(), "packages/templates-basic/templates");

describe("generateDocumentFromMarkdown", () => {
  it("creates a non-empty DOCX", async () => {
    const outputDir = await mkdtemp(path.join(tmpdir(), "docform-core-docx-"));
    const outputPath = path.join(outputDir, "report.docx");

    await generateDocumentFromMarkdown({
      contentMarkdown: "# DOCX Report\n\nGenerated from core.",
      outputPath,
      templateId: "minimal",
      format: "docx",
      templatesRoot
    });

    const output = await stat(outputPath);
    expect(output.size).toBeGreaterThan(0);

    const header = await readFile(outputPath, { encoding: "utf8" });
    expect(header.startsWith("PK")).toBe(true);
  });
});
