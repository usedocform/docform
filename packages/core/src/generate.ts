import { readFile } from "node:fs/promises";
import type { DocumentModel } from "./document-model/types.js";
import { parseMarkdown } from "./input/markdown.js";
import { renderHtml } from "./renderers/html.js";
import { renderPdf } from "./renderers/pdf.js";
import { TemplateRegistry } from "./templates/registry.js";
import { assertRequiredPath, assertSupportedFormat, assertValidDocumentModel, type OutputFormat } from "./validation.js";

export type GenerateDocumentOptions = {
  inputPath: string;
  outputPath: string;
  templateId: string;
  format: string;
  templatesRoot: string;
};

export type GenerateDocumentFromMarkdownOptions = {
  contentMarkdown: string;
  outputPath: string;
  templateId: string;
  format: string;
  templatesRoot: string;
};

export type GenerateDocumentFromModelOptions = {
  model: DocumentModel;
  outputPath: string;
  templateId: string;
  format: string;
  templatesRoot: string;
};

type ValidatedGenerateDocumentFromModelOptions = Omit<GenerateDocumentFromModelOptions, "format"> & {
  format: OutputFormat;
};

export async function generateDocument(options: GenerateDocumentOptions): Promise<void> {
  assertRequiredPath(options.inputPath, "inputPath");
  assertRequiredPath(options.outputPath, "outputPath");
  assertRequiredPath(options.templateId, "templateId");
  assertRequiredPath(options.templatesRoot, "templatesRoot");
  const format = options.format;
  assertSupportedFormat(format);

  const markdown = await readFile(options.inputPath, "utf8");
  const model = parseMarkdown(markdown);
  await renderDocumentModelToPdf({
    model,
    outputPath: options.outputPath,
    templateId: options.templateId,
    format,
    templatesRoot: options.templatesRoot
  });
}

export async function generateDocumentFromMarkdown(options: GenerateDocumentFromMarkdownOptions): Promise<void> {
  assertRequiredPath(options.outputPath, "outputPath");
  assertRequiredPath(options.templateId, "templateId");
  assertRequiredPath(options.templatesRoot, "templatesRoot");
  const format = options.format;
  assertSupportedFormat(format);

  const model = parseMarkdown(options.contentMarkdown);
  await renderDocumentModelToPdf({ ...options, model, format });
}

export async function generateDocumentFromModel(options: GenerateDocumentFromModelOptions): Promise<void> {
  assertRequiredPath(options.outputPath, "outputPath");
  assertRequiredPath(options.templateId, "templateId");
  assertRequiredPath(options.templatesRoot, "templatesRoot");
  const format = options.format;
  assertSupportedFormat(format);
  assertValidDocumentModel(options.model);

  await renderDocumentModelToPdf({ ...options, format });
}

export async function renderHtmlFromMarkdown(options: {
  contentMarkdown: string;
  templateId: string;
  templatesRoot: string;
}): Promise<string> {
  assertRequiredPath(options.templateId, "templateId");
  assertRequiredPath(options.templatesRoot, "templatesRoot");

  const model = parseMarkdown(options.contentMarkdown);
  assertValidDocumentModel(model);

  const registry = new TemplateRegistry(options.templatesRoot);
  const template = await registry.get(options.templateId);
  if (!template.manifest.formats.includes("html")) {
    throw new Error(`Template "${options.templateId}" does not support "html".`);
  }

  return renderHtml(model, template);
}

async function renderDocumentModelToPdf(options: ValidatedGenerateDocumentFromModelOptions): Promise<void> {
  assertValidDocumentModel(options.model);

  const registry = new TemplateRegistry(options.templatesRoot);
  const template = await registry.get(options.templateId);
  if (!template.manifest.formats.includes(options.format)) {
    throw new Error(`Template "${options.templateId}" does not support "${options.format}".`);
  }

  const html = renderHtml(options.model, template);
  await renderPdf(html, options.outputPath, template);
}
