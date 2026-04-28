import type { DocumentBlock, DocumentModel } from "@docform/core";
import { enforceDocumentLimits, type DocumentLimits } from "./enforce-document-limits.js";
import { sanitizeAiContent } from "./sanitize-ai-content.js";
import { AiOutputValidationError } from "./ai-output-validation-error.js";
import { normalizeTone } from "../style/recommend-style.js";
import type { AiComposedDocument } from "../composer/compose-types.js";
import type { StyleProfile } from "../style/style-profile.js";

export { AiOutputValidationError };

export function validateAiOutput(value: unknown, limits?: DocumentLimits): AiComposedDocument {
  if (!isRecord(value)) {
    throw new AiOutputValidationError("AI output must be an object.");
  }

  const document = parseDocumentModel(value.document);
  const templateId = parseTemplateId(value.templateId ?? value.template);
  const styleProfile = parseStyleProfile(value.styleProfile ?? value.style);

  sanitizeAiContent(document);
  enforceDocumentLimits(document, limits);

  return {
    document,
    templateId,
    styleProfile
  };
}

function parseDocumentModel(value: unknown): DocumentModel {
  if (!isRecord(value)) {
    throw new AiOutputValidationError("AI output document must be an object.");
  }

  if (!isRecord(value.metadata)) {
    throw new AiOutputValidationError("AI output document.metadata must be an object.");
  }

  const language = value.metadata.language;
  if (language !== undefined && language !== "ru" && language !== "en") {
    throw new AiOutputValidationError("AI output document.metadata.language must be ru or en.");
  }

  if (!Array.isArray(value.blocks)) {
    throw new AiOutputValidationError("AI output document.blocks must be an array.");
  }

  return {
    metadata: {
      title: parseOptionalString(value.metadata.title),
      language
    },
    blocks: value.blocks.map(parseBlock)
  };
}

function parseBlock(value: unknown): DocumentBlock {
  if (!isRecord(value) || typeof value.type !== "string") {
    throw new AiOutputValidationError("AI output block must include a type.");
  }

  switch (value.type) {
    case "heading":
      if (value.level !== 1 && value.level !== 2 && value.level !== 3) {
        throw new AiOutputValidationError("AI output heading level must be 1, 2, or 3.");
      }
      return { type: "heading", level: value.level, text: parseRequiredString(value.text, "heading.text") };
    case "paragraph":
      return { type: "paragraph", text: parseRequiredString(value.text, "paragraph.text") };
    case "list":
      return { type: "list", ordered: Boolean(value.ordered), items: parseStringArray(value.items, "list.items") };
    case "quote":
      return { type: "quote", text: parseRequiredString(value.text, "quote.text") };
    case "code":
      return {
        type: "code",
        language: parseOptionalString(value.language),
        code: parseRequiredString(value.code, "code.code")
      };
    case "table":
      return {
        type: "table",
        columns: parseStringArray(value.columns, "table.columns"),
        rows: parseStringMatrix(value.rows, "table.rows")
      };
    default:
      throw new AiOutputValidationError(`Unsupported AI output block type "${value.type}".`);
  }
}

function parseTemplateId(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return "minimal";
  }

  return value === "auto" ? "minimal" : value;
}

function parseStyleProfile(value: unknown): StyleProfile {
  if (!isRecord(value)) {
    return { tone: "minimal", density: "normal", fontScale: "normal" };
  }

  return {
    tone: normalizeTone(parseOptionalString(value.tone)) ?? "minimal",
    density: value.density === "compact" || value.density === "normal" ? value.density : "normal",
    fontScale:
      value.fontScale === "compact" || value.fontScale === "normal" || value.fontScale === "large"
        ? value.fontScale
        : "normal",
    accentColor: parseOptionalString(value.accentColor)
  };
}

function parseRequiredString(value: unknown, name: string): string {
  if (typeof value !== "string") {
    throw new AiOutputValidationError(`AI output ${name} must be a string.`);
  }

  return value;
}

function parseStringArray(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new AiOutputValidationError(`AI output ${name} must be an array of strings.`);
  }

  return value;
}

function parseStringMatrix(value: unknown, name: string): string[][] {
  if (!Array.isArray(value) || !value.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === "string"))) {
    throw new AiOutputValidationError(`AI output ${name} must be a string matrix.`);
  }

  return value;
}

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
