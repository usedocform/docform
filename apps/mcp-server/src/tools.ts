import { randomUUID } from "node:crypto";
import path from "node:path";
import { generateDocumentFromMarkdown, renderHtmlFromMarkdown, TemplateRegistry } from "@docform/core";
import type { OutputFormat } from "@docform/core";

export type McpToolName = "generate_document" | "preview_document" | "list_templates" | "get_template";

export type McpToolDefinition = {
  name: McpToolName;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type McpToolContext = {
  cwd: string;
  templatesRoot: string;
  outputRoot: string;
};

export type McpToolResult = Record<string, unknown>;

export type CreateToolContextOptions = {
  cwd?: string;
  templatesRoot?: string;
  outputRoot?: string;
  env?: NodeJS.ProcessEnv;
};

export const toolDefinitions: McpToolDefinition[] = [
  {
    name: "generate_document",
    description: "Generate a PDF or DOCX document from Markdown through DocForm core.",
    inputSchema: {
      type: "object",
      properties: {
        format: { type: "string", enum: ["pdf", "docx"], default: "pdf" },
        template: { type: "string", default: "minimal" },
        content_markdown: { type: "string" },
        output_path: { type: "string" }
      },
      required: ["content_markdown"]
    }
  },
  {
    name: "preview_document",
    description: "Render an HTML preview from Markdown through DocForm core.",
    inputSchema: {
      type: "object",
      properties: {
        template: { type: "string", default: "minimal" },
        content_markdown: { type: "string" }
      },
      required: ["content_markdown"]
    }
  },
  {
    name: "list_templates",
    description: "List templates from the DocForm template registry.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "get_template",
    description: "Get template metadata from the DocForm template registry.",
    inputSchema: {
      type: "object",
      properties: {
        template: { type: "string", default: "minimal" }
      }
    }
  }
];

export function createToolContext(options: CreateToolContextOptions = {}): McpToolContext {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.env.INIT_CWD ?? process.cwd();

  return {
    cwd,
    templatesRoot: path.resolve(cwd, options.templatesRoot ?? env.DOCFORM_TEMPLATES_ROOT ?? "packages/templates-basic/templates"),
    outputRoot: path.resolve(cwd, options.outputRoot ?? env.DOCFORM_OUTPUT_ROOT ?? "output")
  };
}

export async function callTool(name: string, args: unknown, context: McpToolContext): Promise<McpToolResult> {
  switch (name) {
    case "generate_document":
      return generateDocument(args, context);
    case "preview_document":
      return previewDocument(args, context);
    case "list_templates":
      return listTemplates(context);
    case "get_template":
      return getTemplate(args, context);
    default:
      throw new Error(`Unknown MCP tool "${name}".`);
  }
}

async function generateDocument(args: unknown, context: McpToolContext): Promise<McpToolResult> {
  const input = requireObject(args);
  const contentMarkdown = requireString(input.content_markdown, "content_markdown");
  const templateId = optionalString(input.template, "template") ?? "minimal";
  const format = parseOutputFormat(optionalString(input.format, "format") ?? "pdf");
  const outputPath = resolveOutputPath(input.output_path, context, format);

  await generateDocumentFromMarkdown({
    contentMarkdown,
    outputPath,
    templateId,
    format,
    templatesRoot: context.templatesRoot
  });

  return {
    status: "completed",
    format,
    template: templateId,
    file_path: path.relative(context.cwd, outputPath)
  };
}

async function previewDocument(args: unknown, context: McpToolContext): Promise<McpToolResult> {
  const input = requireObject(args);
  const contentMarkdown = requireString(input.content_markdown, "content_markdown");
  const templateId = optionalString(input.template, "template") ?? "minimal";
  const html = await renderHtmlFromMarkdown({
    contentMarkdown,
    templateId,
    templatesRoot: context.templatesRoot
  });

  return {
    status: "completed",
    format: "html",
    template: templateId,
    html
  };
}

async function listTemplates(context: McpToolContext): Promise<McpToolResult> {
  const registry = new TemplateRegistry(context.templatesRoot);
  const templates = await registry.list();

  return {
    templates: templates.map((template) => ({
      id: template.id,
      name: template.name,
      version: template.version,
      formats: template.formats,
      layout: template.layout,
      design: template.design,
      source: "basic"
    }))
  };
}

async function getTemplate(args: unknown, context: McpToolContext): Promise<McpToolResult> {
  const input = requireObject(args);
  const templateId = optionalString(input.template, "template") ?? "minimal";
  const registry = new TemplateRegistry(context.templatesRoot);
  const template = await registry.get(templateId);

  return {
    id: template.manifest.id,
    name: template.manifest.name,
    version: template.manifest.version,
    formats: template.manifest.formats,
    default_options: template.manifest.defaultOptions,
    layout: template.manifest.layout,
    design: template.manifest.design,
    source: "basic"
  };
}

function resolveOutputPath(value: unknown, context: McpToolContext, format: OutputFormat): string {
  const requestedPath = optionalString(value, "output_path");
  if (requestedPath) {
    return path.resolve(context.cwd, requestedPath);
  }

  return path.join(context.outputRoot, `mcp_${randomUUID()}.${format}`);
}

function parseOutputFormat(format: string): OutputFormat {
  if (format === "pdf" || format === "docx") {
    return format;
  }

  throw new Error(`Unsupported output format "${format}". Supported formats: "pdf", "docx".`);
}

function requireObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Tool input must be an object.");
  }

  return value as Record<string, unknown>;
}

function requireString(value: unknown, name: string): string {
  const parsed = optionalString(value, name);
  if (!parsed) {
    throw new Error(`Missing required field "${name}".`);
  }

  return parsed;
}

function optionalString(value: unknown, name: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`Field "${name}" must be a string.`);
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}
