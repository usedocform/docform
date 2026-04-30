import { randomUUID } from "node:crypto";
import path from "node:path";
import type { FastifyInstance, FastifyReply } from "fastify";
import { generateDocumentFromMarkdown, renderHtmlFromMarkdown } from "@docform/core";
import type { ApiConfig } from "../config.js";
import { optionalString, requireObject, requireString } from "../http/validation.js";

type GenerateDocumentRequest = {
  content_markdown?: unknown;
  template?: unknown;
  format?: unknown;
  output_path?: unknown;
};

type PreviewDocumentRequest = {
  content_markdown?: unknown;
  template?: unknown;
};

export function registerDocumentRoutes(server: FastifyInstance, config: ApiConfig): void {
  server.post("/v1/documents/generate", async (request, reply) =>
    handleGenerate(request.body as GenerateDocumentRequest, reply, config)
  );

  server.post("/v1/documents/preview", async (request, reply) =>
    handlePreview(request.body as PreviewDocumentRequest, reply, config)
  );
}

async function handleGenerate(
  body: GenerateDocumentRequest | undefined,
  reply: FastifyReply,
  config: ApiConfig
): Promise<void> {
  const requestBody = requireObject(body);
  const contentMarkdown = requireString(requestBody.content_markdown, "content_markdown");
  const templateId = optionalString(requestBody.template, "template") ?? "minimal";
  const format = optionalString(requestBody.format, "format") ?? "pdf";
  const documentId = `doc_${randomUUID()}`;
  const outputPath = resolveOutputPath(config, requestBody.output_path, documentId, format);

  await generateDocumentFromMarkdown({
    contentMarkdown,
    outputPath,
    templateId,
    format,
    templatesRoot: config.templatesRoot
  });

  reply.send({
    document_id: documentId,
    status: "completed",
    format,
    template: templateId,
    file_path: path.relative(config.cwd, outputPath),
    stats: {
      pages: null
    }
  });
}

async function handlePreview(
  body: PreviewDocumentRequest | undefined,
  reply: FastifyReply,
  config: ApiConfig
): Promise<void> {
  const requestBody = requireObject(body);
  const contentMarkdown = requireString(requestBody.content_markdown, "content_markdown");
  const templateId = optionalString(requestBody.template, "template") ?? "minimal";
  const html = await renderHtmlFromMarkdown({
    contentMarkdown,
    templateId,
    templatesRoot: config.templatesRoot
  });

  reply.send({
    document_id: `preview_${randomUUID()}`,
    status: "completed",
    format: "html",
    template: templateId,
    html
  });
}

function resolveOutputPath(config: ApiConfig, value: unknown, documentId: string, format: string): string {
  const requestedPath = optionalString(value, "output_path");
  if (requestedPath) {
    return path.resolve(config.cwd, requestedPath);
  }

  return path.join(config.outputRoot, `${documentId}.${format}`);
}
