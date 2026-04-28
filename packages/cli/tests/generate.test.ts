import { execFile } from "node:child_process";
import { mkdtemp, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("docform generate", () => {
  it("creates a non-empty PDF from Markdown", async () => {
    const outputDir = await mkdtemp(path.join(tmpdir(), "docform-"));
    const outputPath = path.join(outputDir, "report.pdf");

    await execFileAsync(
      process.execPath,
      [
        "--conditions",
        "development",
        "--import",
        "tsx",
        "packages/cli/src/index.ts",
        "generate",
        "--input",
        "examples/markdown/report.md",
        "--template",
        "minimal",
        "--format",
        "pdf",
        "--output",
        outputPath
      ],
      { cwd: process.cwd() }
    );

    const output = await stat(outputPath);
    expect(output.size).toBeGreaterThan(0);
  });

  it("creates a non-empty PDF from text with the mock AI provider", async () => {
    const outputDir = await mkdtemp(path.join(tmpdir(), "docform-ai-"));
    const inputPath = path.join(outputDir, "raw.txt");
    const outputPath = path.join(outputDir, "report.pdf");
    await writeFile(inputPath, "Quarterly report draft", "utf8");

    await execFileAsync(
      process.execPath,
      [
        "--conditions",
        "development",
        "--import",
        "tsx",
        "packages/cli/src/index.ts",
        "generate",
        "--input",
        inputPath,
        "--ai-instruction",
        "make it office style",
        "--ai-provider",
        "mock",
        "--template",
        "minimal",
        "--format",
        "pdf",
        "--output",
        outputPath
      ],
      { cwd: process.cwd() }
    );

    const output = await stat(outputPath);
    expect(output.size).toBeGreaterThan(0);
  });
});
