import { ValidationError } from "./errors.js";
import type { DocumentBlock, DocumentModel } from "./document-model/types.js";

export type OutputFormat = "pdf" | "docx";

export function assertSupportedFormat(format: string): asserts format is OutputFormat {
  if (format !== "pdf" && format !== "docx") {
    throw new ValidationError(`Unsupported output format "${format}". Supported formats: "pdf", "docx".`);
  }
}

export function assertRequiredPath(value: string | undefined, name: string): asserts value is string {
  if (!value?.trim()) {
    throw new ValidationError(`Missing required option "${name}".`);
  }
}

export function assertValidDocumentModel(value: DocumentModel): void {
  if (!value.metadata || typeof value.metadata !== "object") {
    throw new ValidationError("Document metadata must be an object.");
  }

  if (!Array.isArray(value.blocks) || value.blocks.length === 0) {
    throw new ValidationError("Document must contain at least one block.");
  }

  for (const block of value.blocks) {
    assertValidBlock(block);
  }
}

function assertValidBlock(block: DocumentBlock): void {
  switch (block.type) {
    case "heading":
      assertString(block.text, "heading.text");
      return;
    case "paragraph":
      assertString(block.text, "paragraph.text");
      return;
    case "list":
      if (!Array.isArray(block.items) || !block.items.every((item) => typeof item === "string")) {
        throw new ValidationError("List items must be strings.");
      }
      return;
    case "quote":
      assertString(block.text, "quote.text");
      return;
    case "code":
      assertString(block.code, "code.code");
      return;
    case "table":
      if (!Array.isArray(block.columns) || !block.columns.every((column) => typeof column === "string")) {
        throw new ValidationError("Table columns must be strings.");
      }
      if (
        !Array.isArray(block.rows) ||
        !block.rows.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === "string"))
      ) {
        throw new ValidationError("Table rows must be string arrays.");
      }
      return;
  }
}

function assertString(value: string, name: string): void {
  if (typeof value !== "string") {
    throw new ValidationError(`${name} must be a string.`);
  }
}
