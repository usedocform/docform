import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import { renderHtmlFromMarkdown, ValidationError } from "@docform/core";
import type { ApiConfig } from "../config.js";
import { generateAndStoreDocument } from "../generate-document.js";
import { optionalString, requireObject, requireString } from "../http/validation.js";
import type { GenerateJobStore } from "../jobs.js";

type GenerateDocumentRequest = {
  content_markdown?: unknown;
  template?: unknown;
  format?: unknown;
  output_path?: unknown;
  mode?: unknown;
};

type PreviewDocumentRequest = {
  content_markdown?: unknown;
  template?: unknown;
};

export function registerDocumentRoutes(server: FastifyInstance, config: ApiConfig, jobs?: GenerateJobStore): void {
  server.post("/v1/documents/generate", async (request, reply) =>
    handleGenerate(request.body as GenerateDocumentRequest, reply, config, jobs)
  );

  server.get<{ Params: { id: string } }>("/v1/documents/:id", async (request, reply) =>
    handleGetDocument(reply, jobs, request.params.id)
  );

  server.post("/v1/documents/preview", async (request, reply) =>
    handlePreview(request.body as PreviewDocumentRequest, reply, config)
  );
}

async function handleGenerate(
  body: GenerateDocumentRequest | undefined,
  reply: FastifyReply,
  config: ApiConfig,
  jobs?: GenerateJobStore
): Promise<void> {
  const requestBody = requireObject(body);
  const contentMarkdown = requireString(requestBody.content_markdown, "content_markdown");
  const templateId = optionalString(requestBody.template, "template") ?? "minimal";
  const format = optionalString(requestBody.format, "format") ?? "pdf";
  const mode = parseGenerateMode(optionalString(requestBody.mode, "mode") ?? "sync");
  const documentId = `doc_${randomUUID()}`;

  const command = {
    documentId,
    contentMarkdown,
    templateId,
    format,
    requestedPath: optionalString(requestBody.output_path, "output_path")
  };

  if (mode === "async") {
    if (!jobs) {
      throw new ValidationError("Async generation jobs are not configured.");
    }

    await jobs.enqueue({
      ...command,
      requestedOutputPath: command.requestedPath
    });
    reply.status(202).send({
      document_id: documentId,
      status: "queued"
    });
    return;
  }

  const result = await generateAndStoreDocument({
    ...command,
    requestedOutputPath: command.requestedPath
  }, config);
  reply.send(result);
}

async function handleGetDocument(reply: FastifyReply, jobs: GenerateJobStore | undefined, documentId: string): Promise<void> {
  const job = jobs ? await jobs.get(documentId) : undefined;
  if (!job) {
    reply.status(404).send({
      error: {
        code: "DOCUMENT_NOT_FOUND",
        message: `Document "${documentId}" was not found.`
      }
    });
    return;
  }

  reply.send(job);
}

function parseGenerateMode(value: string): "sync" | "async" {
  if (value === "sync" || value === "async") {
    return value;
  }

  throw new ValidationError('Field "mode" must be "sync" or "async".');
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

