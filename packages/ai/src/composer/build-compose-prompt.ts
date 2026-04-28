import type { StyleProfile } from "../style/style-profile.js";

export type BuildComposePromptInput = {
  text: string;
  instruction: string;
  language?: "ru" | "en";
  template?: "auto" | string;
  styleProfile: StyleProfile;
};

export type BuiltComposePrompt = {
  systemPrompt: string;
  userPrompt: string;
};

export function buildComposePrompt(input: BuildComposePromptInput): BuiltComposePrompt {
  return {
    systemPrompt: [
      "You are DocForm Document Composer.",
      "Return only valid JSON. Do not include Markdown fences or commentary.",
      "Convert the user's text into a professional structured document.",
      "Use only these block types: heading, paragraph, list, quote, code, table.",
      "Do not output HTML, JavaScript, CSS, or arbitrary styling.",
      "The JSON shape must be: { document: { metadata, blocks }, templateId, styleProfile }."
    ].join("\n"),
    userPrompt: JSON.stringify(
      {
        text: input.text,
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
