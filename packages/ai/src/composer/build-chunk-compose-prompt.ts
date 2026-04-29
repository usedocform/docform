import type { StyleProfile } from "../style/style-profile.js";
import type { BuiltComposePrompt } from "./build-compose-prompt.js";
import type { TextChunk } from "./split-text-into-chunks.js";

export type BuildChunkComposePromptInput = {
  chunk: TextChunk;
  instruction: string;
  language?: "ru" | "en";
  template?: "auto" | string;
  styleProfile: StyleProfile;
};

export function buildChunkComposePrompt(input: BuildChunkComposePromptInput): BuiltComposePrompt {
  return {
    systemPrompt: [
      "You are DocForm Document Composer.",
      "Return only valid JSON. Do not include Markdown fences or commentary.",
      "Convert this document section into a partial professional structured document.",
      "Use only these block types: heading, paragraph, list, quote, code, table.",
      "Do not output HTML, JavaScript, CSS, or arbitrary styling.",
      "Keep the partial output concise because it will be merged with other sections.",
      "The JSON shape must be: { document: { metadata, blocks }, templateId, styleProfile }."
    ].join("\n"),
    userPrompt: JSON.stringify(
      {
        section: {
          index: input.chunk.index,
          total: input.chunk.total,
          text: input.chunk.text
        },
        instruction: input.instruction,
        language: input.language,
        template: input.template ?? "auto",
        preferredStyleProfile: input.styleProfile
      },
      null,
      2
    )
  };
}
