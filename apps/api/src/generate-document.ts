import { rm } from "node:fs/promises";
import { generateDocumentFromMarkdown } from "@docform/core";
import type { ApiConfig } from "./config.js";
import { createDocumentStorage, type StoredDocument } from "./storage.js";

export type GenerateDocumentCommand = {
  documentId: string;
  contentMarkdown: string;
  templateId: string;
  format: string;
  requestedOutputPath?: string;
};

export type GenerateDocumentResponse = {
  document_id: string;
  status: "completed";
  format: string;
  template: string;
  stats: {
    pages: number | null;
  };
} & StoredDocument;

export async function generateAndStoreDocument(
  command: GenerateDocumentCommand,
  config: ApiConfig
): Promise<GenerateDocumentResponse> {
  const storage = createDocumentStorage(config);
  const outputPath = storage.resolveOutputPath({
    documentId: command.documentId,
    format: command.format,
    requestedPath: command.requestedOutputPath
  });

  await generateDocumentFromMarkdown({
    contentMarkdown: command.contentMarkdown,
    outputPath,
    templateId: command.templateId,
    format: command.format,
    templatesRoot: config.templatesRoot
  });

  const storedDocument = await storage.storeGeneratedDocument({
    documentId: command.documentId,
    format: command.format,
    localPath: outputPath
  });

  if (storedDocument.storage === "s3") {
    await rm(outputPath, { force: true });
  }

  return {
    document_id: command.documentId,
    status: "completed",
    format: command.format,
    template: command.templateId,
    ...storedDocument,
    stats: {
      pages: null
    }
  };
}
