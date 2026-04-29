import type { DocumentModel } from "@docform/core";
import type { StyleProfile } from "../style/style-profile.js";
import type { BuiltComposePrompt } from "./build-compose-prompt.js";

export type BuildReducePromptInput = {
  document: DocumentModel;
  instruction: string;
  language?: "ru" | "en";
  template?: "auto" | string;
  styleProfile: StyleProfile;
  maxBlocks: number;
  maxTextLength: number;
};

export function buildReducePrompt(input: BuildReducePromptInput): BuiltComposePrompt {
  return {
    systemPrompt: [
      "You are DocForm Document Composer.",
      "Return only valid JSON. Do not include Markdown fences or commentary.",
      "Condense the structured document into a final professional document.",
      "Preserve the most important headings, facts, decisions, risks, and action items.",
      "Use only these block types: heading, paragraph, list, quote, code, table.",
      "Do not output HTML, JavaScript, CSS, or arbitrary styling.",
      "The JSON shape must be: { document: { metadata, blocks }, templateId, styleProfile }."
    ].join("\n"),
    userPrompt: JSON.stringify(
      {
        document: input.document,
        instruction: input.instruction,
        language: input.language,
        template: input.template ?? "auto",
        preferredStyleProfile: input.styleProfile,
        limits: {
          maxBlocks: input.maxBlocks,
          maxTextLength: input.maxTextLength
        }
      },
      null,
      2
    )
  };
}
