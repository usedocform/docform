#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { composeDocument, createAiProvider, type AiProviderName } from "@docform/ai";
import { createApiServer } from "@docform/api";
import { generateDocument, generateDocumentFromModel } from "@docform/core";
import { startMcpServer } from "@docform/mcp-server";

type GenerateArgs = {
  input?: string;
  output?: string;
  template: string;
  format: string;
  templatesRoot?: string;
  ai: boolean;
  aiInstruction?: string;
  aiProvider?: AiProviderName;
  aiModel?: string;
  aiBaseUrl?: string;
  aiApiKey?: string;
  aiStyle?: string;
};

type ServeArgs = {
  host: string;
  port: number;
  templatesRoot?: string;
  outputRoot?: string;
};

type McpArgs = {
  templatesRoot?: string;
  outputRoot?: string;
};

type NewThemeArgs = {
  id: string;
  name?: string;
};

async function main(argv: string[]): Promise<void> {
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  const [command, ...rest] = normalizedArgv;

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  switch (command) {
    case "generate":
      if (isHelp(rest)) {
        printGenerateHelp();
        return;
      }
      await runGenerate(rest);
      return;
    case "serve":
      if (isHelp(rest)) {
        printServeHelp();
        return;
      }
      await runServe(rest);
      return;
    case "mcp":
      if (isHelp(rest)) {
        printMcpHelp();
        return;
      }
      await runMcp(rest);
      return;
    case "new-theme":
      if (isHelp(rest)) {
        printNewThemeHelp();
        return;
      }
      await runNewTheme(rest);
      return;
    default:
      throw new Error(`Unknown command "${command}".`);
  }
}

async function runGenerate(argv: string[]): Promise<void> {
  const args = parseGenerateArgs(argv);
  if (!args.input || !args.output) {
    throw new Error("Both --input and --output are required.");
  }

  const cwd = process.env.INIT_CWD ?? process.cwd();
  const inputPath = path.resolve(cwd, args.input);
  const outputPath = path.resolve(cwd, args.output);
  const templatesRoot = path.resolve(cwd, args.templatesRoot ?? "packages/templates-basic/templates");

  if (args.ai || args.aiInstruction) {
    if (!args.aiInstruction) {
      throw new Error("--ai-instruction is required when AI generation is enabled.");
    }

    const provider = createAiProvider({
      provider: args.aiProvider,
      model: args.aiModel,
      baseUrl: args.aiBaseUrl,
      apiKey: args.aiApiKey
    });
    const text = await readFile(inputPath, "utf8");
    const composed = await composeDocument({
      text,
      instruction: args.aiInstruction,
      template: args.template,
      style: args.aiStyle,
      provider
    });

    await generateDocumentFromModel({
      model: composed.document,
      outputPath,
      templateId: args.template === "auto" ? composed.templateId : args.template,
      format: args.format,
      templatesRoot
    });
  } else {
    await generateDocument({
      inputPath,
      outputPath,
      templateId: args.template,
      format: args.format,
      templatesRoot
    });
  }

  console.log(`Created ${args.output}`);
}

async function runServe(argv: string[]): Promise<void> {
  const args = parseServeArgs(argv);
  const cwd = process.env.INIT_CWD ?? process.cwd();
  const server = createApiServer({
    cwd,
    templatesRoot: args.templatesRoot,
    outputRoot: args.outputRoot
  });

  const address = await server.listen({ port: args.port, host: args.host });
  console.log(`DocForm API listening on ${address}`);
}

async function runMcp(argv: string[]): Promise<void> {
  const args = parseMcpArgs(argv);
  const cwd = process.env.INIT_CWD ?? process.cwd();
  await startMcpServer({
    cwd,
    templatesRoot: args.templatesRoot,
    outputRoot: args.outputRoot
  });
}

async function runNewTheme(argv: string[]): Promise<void> {
  const args = parseNewThemeArgs(argv);
  const themesRoot = getUserThemesRoot();
  const themeDirectory = path.join(themesRoot, args.id);

  await mkdir(themesRoot, { recursive: true });
  await mkdir(themeDirectory);
  await Promise.all([
    writeFile(path.join(themeDirectory, "template.json"), createThemeManifest(args), "utf8"),
    writeFile(path.join(themeDirectory, "styles.css"), createThemeStyles(), "utf8")
  ]);

  console.log(`Created theme "${args.id}" at ${themeDirectory}`);
  console.log(`Use it with --template ${args.id} --templates-root ${themesRoot}`);
}

function parseGenerateArgs(argv: string[]): GenerateArgs {
  const args: GenerateArgs = {
    template: "minimal",
    format: "pdf",
    ai: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];

    if (!flag?.startsWith("--")) {
      throw new Error(`Unexpected argument "${flag}".`);
    }

    switch (flag) {
      case "--ai":
        args.ai = true;
        break;
      case "--input":
        args.input = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--output":
        args.output = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--template":
        args.template = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--format":
        args.format = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--templates-root":
        args.templatesRoot = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--ai-instruction":
        args.aiInstruction = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--ai-provider":
        args.aiProvider = parseAiProvider(readFlagValue(argv, index, flag));
        index += 1;
        break;
      case "--ai-model":
        args.aiModel = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--ai-base-url":
        args.aiBaseUrl = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--ai-api-key":
        args.aiApiKey = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--ai-style":
        args.aiStyle = readFlagValue(argv, index, flag);
        index += 1;
        break;
      default:
        throw new Error(`Unknown option "${flag}".`);
    }
  }

  return args;
}

function parseServeArgs(argv: string[]): ServeArgs {
  const args: ServeArgs = {
    host: process.env.HOST ?? "0.0.0.0",
    port: Number.parseInt(process.env.PORT ?? "3000", 10)
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];

    if (!flag?.startsWith("--")) {
      throw new Error(`Unexpected argument "${flag}".`);
    }

    switch (flag) {
      case "--host":
        args.host = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--port":
        args.port = parsePort(readFlagValue(argv, index, flag));
        index += 1;
        break;
      case "--templates-root":
        args.templatesRoot = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--output-root":
        args.outputRoot = readFlagValue(argv, index, flag);
        index += 1;
        break;
      default:
        throw new Error(`Unknown option "${flag}".`);
    }
  }

  if (!Number.isInteger(args.port) || args.port <= 0 || args.port > 65535) {
    throw new Error("--port must be an integer between 1 and 65535.");
  }

  return args;
}

function parseMcpArgs(argv: string[]): McpArgs {
  const args: McpArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];

    if (!flag?.startsWith("--")) {
      throw new Error(`Unexpected argument "${flag}".`);
    }

    switch (flag) {
      case "--templates-root":
        args.templatesRoot = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--output-root":
        args.outputRoot = readFlagValue(argv, index, flag);
        index += 1;
        break;
      default:
        throw new Error(`Unknown option "${flag}".`);
    }
  }

  return args;
}

function parseNewThemeArgs(argv: string[]): NewThemeArgs {
  const args: Partial<NewThemeArgs> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value) {
      continue;
    }

    if (!value.startsWith("--")) {
      if (args.id) {
        throw new Error(`Unexpected argument "${value}".`);
      }
      args.id = value;
      continue;
    }

    switch (value) {
      case "--name":
        args.name = readFlagValue(argv, index, value);
        index += 1;
        break;
      default:
        throw new Error(`Unknown option "${value}".`);
    }
  }

  if (!args.id) {
    throw new Error("Theme id is required.");
  }

  assertValidThemeId(args.id);

  return {
    id: args.id,
    name: args.name
  };
}

function readFlagValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}.`);
  }

  return value;
}

function parsePort(value: string): number {
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || String(port) !== value.trim()) {
    throw new Error("--port must be an integer between 1 and 65535.");
  }

  return port;
}

function parseAiProvider(value: string): AiProviderName {
  if (value === "openai-compatible" || value === "ollama" || value === "mock") {
    return value;
  }

  throw new Error(`Unsupported AI provider "${value}".`);
}

function assertValidThemeId(value: string): void {
  if (/^[a-z0-9][a-z0-9_-]*$/.test(value)) {
    return;
  }

  throw new Error("Theme id must use lowercase letters, numbers, dashes, or underscores.");
}

function getUserThemesRoot(): string {
  const docformHome = process.env.DOCFORM_HOME ? path.resolve(process.env.DOCFORM_HOME) : path.join(homedir(), ".docform");
  return path.join(docformHome, "themes");
}

function createThemeManifest(args: NewThemeArgs): string {
  const manifest = {
    id: args.id,
    name: args.name ?? humanizeThemeId(args.id),
    version: "0.1.0",
    formats: ["pdf", "html", "docx"],
    defaultOptions: {
      pageSize: "A4",
      margin: "20mm"
    },
    layout: {
      header: {
        content: args.name ?? humanizeThemeId(args.id),
        align: "left"
      },
      footer: {
        content: "Generated with DocForm",
        align: "center"
      }
    },
    design: {
      primaryColor: "#2563eb",
      textColor: "#1f2937",
      backgroundColor: "#ffffff",
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      documentMaxWidth: "760px"
    }
  };

  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function createThemeStyles(): string {
  return `@page {
  size: A4;
  margin: 20mm;
}

:root {
  color: var(--docform-text-color, #1f2937);
  font-family: var(
    --docform-font-family,
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif
  );
  line-height: 1.5;
}

body {
  margin: 0;
  background: var(--docform-background-color, #ffffff);
}

.docform-page {
  max-width: var(--docform-document-max-width, 760px);
  margin: 0 auto;
}

.docform-document {
  margin: 0;
}

.docform-header,
.docform-footer {
  color: var(--docform-primary-color, #2563eb);
  font-size: 12px;
  letter-spacing: 0.08em;
  margin: 0 0 24px;
  text-transform: uppercase;
}

.docform-footer {
  color: #6b7280;
  margin: 32px 0 0;
}

.docform-align-left {
  text-align: left;
}

.docform-align-center {
  text-align: center;
}

.docform-align-right {
  text-align: right;
}

h1,
h2,
h3 {
  color: #111827;
  line-height: 1.2;
  margin: 1.4em 0 0.5em;
}

h1 {
  font-size: 32px;
  margin-top: 0;
}

h2 {
  font-size: 24px;
}

h3 {
  font-size: 18px;
}

p,
ul,
ol,
blockquote,
pre,
table {
  margin: 0 0 16px;
}

blockquote {
  border-left: 4px solid #d1d5db;
  color: #4b5563;
  padding-left: 16px;
}

pre {
  background: #f3f4f6;
  border-radius: 8px;
  overflow-wrap: break-word;
  padding: 14px;
  white-space: pre-wrap;
}

code {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 13px;
}

table {
  border-collapse: collapse;
  width: 100%;
}

th,
td {
  border: 1px solid #d1d5db;
  padding: 8px 10px;
  text-align: left;
}

th {
  background: #f9fafb;
  color: #111827;
}
`;
}

function humanizeThemeId(value: string): string {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function isHelp(argv: string[]): boolean {
  return argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h");
}

function printHelp(): void {
  console.log(`DocForm 0.3

Usage:
  docform generate --input examples/markdown/report.md --template minimal --format pdf --output output/report.pdf
  docform generate --input examples/markdown/report.md --template minimal --format docx --output output/report.docx
  docform new-theme company-report --name "Company Report"
  docform serve --port 3000
  docform mcp
  docform generate --input raw.txt --ai-instruction "make it office style" --ai-provider openai-compatible --ai-model gpt-4.1-mini --output output/report.pdf

Commands:
  generate          Generate a PDF or DOCX from Markdown.
  new-theme         Create a user theme in ~/.docform/themes.
  serve             Start the local REST API.
  mcp               Start the local MCP server over stdio.

Run "docform <command> --help" for command options.
`);
}

function printGenerateHelp(): void {
  console.log(`DocForm generate

Usage:
  docform generate --input examples/markdown/report.md --template minimal --format pdf --output output/report.pdf
  docform generate --input examples/markdown/report.md --template minimal --format docx --output output/report.docx

Options:
  --input            Path to a Markdown file.
  --output           Path where the generated document will be saved.
  --template         Template id. Defaults to "minimal".
  --format           Output format: pdf or docx. Defaults to "pdf".
  --templates-root   Templates directory. Defaults to packages/templates-basic/templates.
  --ai               Enable AI composition for the input text.
  --ai-instruction   Instruction for AI composition, for example "make it office style".
  --ai-provider      AI provider: openai-compatible, ollama, or mock.
  --ai-model         AI model name.
  --ai-base-url      AI provider base URL.
  --ai-api-key       AI API key. Prefer DOCFORM_AI_API_KEY for real keys.
  --ai-style         Optional style hint: office, formal, minimal, or sales.

Environment:
  DOCFORM_AI_PROVIDER, DOCFORM_AI_MODEL, DOCFORM_AI_BASE_URL, DOCFORM_AI_API_KEY
`);
}

function printServeHelp(): void {
  console.log(`DocForm serve

Usage:
  docform serve --host 0.0.0.0 --port 3000

Options:
  --host             API bind host. Defaults to HOST or 0.0.0.0.
  --port             API port. Defaults to PORT or 3000.
  --templates-root   Templates directory. Defaults to packages/templates-basic/templates.
  --output-root      Output directory. Defaults to output.

Environment:
  DOCFORM_OUTPUT_ROOT, DOCFORM_API_KEY, DOCFORM_LOG_REQUESTS
`);
}

function printMcpHelp(): void {
  console.log(`DocForm mcp

Usage:
  docform mcp

Options:
  --templates-root   Templates directory. Defaults to DOCFORM_TEMPLATES_ROOT or packages/templates-basic/templates.
  --output-root      Output directory. Defaults to DOCFORM_OUTPUT_ROOT or output.
`);
}

function printNewThemeHelp(): void {
  console.log(`DocForm new-theme

Usage:
  docform new-theme company-report --name "Company Report"

Options:
  --name             Human-readable theme name. Defaults to a title-cased theme id.

Creates:
  ~/.docform/themes/<theme-id>/template.json
  ~/.docform/themes/<theme-id>/styles.css
`);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`DocForm error: ${message}`);
  process.exitCode = 1;
});
