import { execFile } from "node:child_process";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const cliEnv = { ...process.env, INIT_CWD: process.cwd() };

describe("docform generate", () => {
  it("shows help for serve, mcp, and new-theme commands", async () => {
    const serve = await execFileAsync(
      process.execPath,
      ["--conditions", "development", "--import", "tsx", "packages/cli/src/index.ts", "serve", "--help"],
      { cwd: process.cwd(), env: cliEnv }
    );
    const mcp = await execFileAsync(
      process.execPath,
      ["--conditions", "development", "--import", "tsx", "packages/cli/src/index.ts", "mcp", "--help"],
      { cwd: process.cwd(), env: cliEnv }
    );
    const newTheme = await execFileAsync(
      process.execPath,
      ["--conditions", "development", "--import", "tsx", "packages/cli/src/index.ts", "new-theme", "--help"],
      { cwd: process.cwd(), env: cliEnv }
    );

    expect(serve.stdout).toContain("docform serve");
    expect(mcp.stdout).toContain("docform mcp");
    expect(newTheme.stdout).toContain("docform new-theme");
  });

  it("creates a user theme scaffold", async () => {
    const docformHome = await mkdtemp(path.join(tmpdir(), "docform-home-"));

    const result = await execFileAsync(
      process.execPath,
      [
        "--conditions",
        "development",
        "--import",
        "tsx",
        "packages/cli/src/index.ts",
        "new-theme",
        "company-report",
        "--name",
        "Company Report"
      ],
      {
        cwd: process.cwd(),
        env: { ...cliEnv, DOCFORM_HOME: docformHome }
      }
    );

    const themeRoot = path.join(docformHome, "themes", "company-report");
    const manifest = JSON.parse(await readFile(path.join(themeRoot, "template.json"), "utf8")) as {
      id: string;
      name: string;
      formats: string[];
      layout?: {
        header?: {
          content?: string;
        };
        footer?: {
          content?: string;
        };
      };
      design?: {
        primaryColor?: string;
      };
    };
    const styles = await readFile(path.join(themeRoot, "styles.css"), "utf8");

    expect(result.stdout).toContain(`Created theme "company-report"`);
    expect(manifest).toMatchObject({
      id: "company-report",
      name: "Company Report",
      formats: ["pdf", "html", "docx"]
    });
    expect(manifest.layout?.header?.content).toBe("Company Report");
    expect(manifest.layout?.footer?.content).toBe("Generated with DocForm");
    expect(manifest.design?.primaryColor).toBe("#2563eb");
    expect(styles).toContain(".docform-document");
    expect(styles).toContain(".docform-header");
  });

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
      { cwd: process.cwd(), env: cliEnv }
    );

    const output = await stat(outputPath);
    expect(output.size).toBeGreaterThan(0);
  });

  it("creates a non-empty DOCX from Markdown", async () => {
    const outputDir = await mkdtemp(path.join(tmpdir(), "docform-docx-"));
    const outputPath = path.join(outputDir, "report.docx");

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
        "docx",
        "--output",
        outputPath
      ],
      { cwd: process.cwd(), env: cliEnv }
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
      { cwd: process.cwd(), env: cliEnv }
    );

    const output = await stat(outputPath);
    expect(output.size).toBeGreaterThan(0);
  });
});
