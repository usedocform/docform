import type { DocumentBlock, DocumentModel } from "@docform/core";
import { AiOutputValidationError } from "./ai-output-validation-error.js";

const unsafeContentPattern = /<\s*\/?\s*(script|style|iframe|object|embed|link|meta|html|body|head)\b|javascript:/i;

export function sanitizeAiContent(model: DocumentModel): DocumentModel {
  for (const block of model.blocks) {
    assertSafeBlock(block);
  }

  return model;
}

function assertSafeBlock(block: DocumentBlock): void {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "quote":
      assertSafeText(block.text);
      return;
    case "code":
      assertSafeText(block.code);
      return;
    case "list":
      block.items.forEach(assertSafeText);
      return;
    case "table":
      block.columns.forEach(assertSafeText);
      block.rows.flat().forEach(assertSafeText);
      return;
  }
}

function assertSafeText(value: string): void {
  if (unsafeContentPattern.test(value)) {
    throw new AiOutputValidationError("AI output contains unsafe HTML, CSS, or JavaScript.");
  }
}
