import type { DocumentBlock, DocumentModel } from "@docform/core";
import { AiOutputValidationError } from "./ai-output-validation-error.js";

export type DocumentLimits = {
  maxBlocks: number;
  maxTextLength: number;
  maxListItems: number;
  maxTableRows: number;
  maxTableColumns: number;
};

export const defaultDocumentLimits: DocumentLimits = {
  maxBlocks: 80,
  maxTextLength: 20000,
  maxListItems: 50,
  maxTableRows: 100,
  maxTableColumns: 12
};

export function enforceDocumentLimits(model: DocumentModel, limits: DocumentLimits = defaultDocumentLimits): void {
  if (model.blocks.length > limits.maxBlocks) {
    throw new AiOutputValidationError(`AI output contains too many blocks. Max: ${limits.maxBlocks}.`);
  }

  const totalTextLength = model.blocks.reduce((total, block) => total + getBlockTextLength(block), 0);
  if (totalTextLength > limits.maxTextLength) {
    throw new AiOutputValidationError(`AI output text is too long. Max characters: ${limits.maxTextLength}.`);
  }

  for (const block of model.blocks) {
    if (block.type === "list" && block.items.length > limits.maxListItems) {
      throw new AiOutputValidationError(`AI output list contains too many items. Max: ${limits.maxListItems}.`);
    }

    if (block.type === "table") {
      if (block.columns.length > limits.maxTableColumns) {
        throw new AiOutputValidationError(`AI output table contains too many columns. Max: ${limits.maxTableColumns}.`);
      }
      if (block.rows.length > limits.maxTableRows) {
        throw new AiOutputValidationError(`AI output table contains too many rows. Max: ${limits.maxTableRows}.`);
      }
    }
  }
}

function getBlockTextLength(block: DocumentBlock): number {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "quote":
      return block.text.length;
    case "code":
      return block.code.length;
    case "list":
      return block.items.join("").length;
    case "table":
      return block.columns.join("").length + block.rows.flat().join("").length;
  }
}
