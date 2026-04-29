import type { DocumentModel } from "@docform/core";
import type { AiComposedDocument } from "./compose-types.js";

export function mergeComposedDocuments(documents: AiComposedDocument[]): AiComposedDocument {
  const first = documents[0];
  if (!first) {
    return {
      document: {
        metadata: {},
        blocks: []
      },
      templateId: "minimal",
      styleProfile: { tone: "minimal", density: "normal", fontScale: "normal" }
    };
  }

  const document: DocumentModel = {
    metadata: {
      title: first.document.metadata.title,
      language: first.document.metadata.language
    },
    blocks: documents.flatMap((item) => item.document.blocks)
  };

  return {
    document,
    templateId: first.templateId,
    styleProfile: first.styleProfile
  };
}
