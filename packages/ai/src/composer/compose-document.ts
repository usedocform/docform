import type { DocumentModel } from "@docform/core";
import { buildComposePrompt } from "./build-compose-prompt.js";
import type { AiTokenUsage } from "./compose-types.js";
import { validateAiOutput } from "../guardrails/validate-ai-output.js";
import type { AiProvider } from "../providers/ai-provider.js";
import { recommendStyle } from "../style/recommend-style.js";
import type { StyleProfile } from "../style/style-profile.js";

export type ComposeDocumentInput = {
  text: string;
  instruction: string;
  language?: "ru" | "en";
  template?: "auto" | string;
  style?: "office" | "formal" | "minimal" | "sales" | string;
  provider: AiProvider;
};

export type ComposeDocumentResult = {
  document: DocumentModel;
  templateId: string;
  styleProfile: StyleProfile;
  ai: {
    provider: string;
    model: string;
    usage?: AiTokenUsage;
  };
};

export async function composeDocument(input: ComposeDocumentInput): Promise<ComposeDocumentResult> {
  const styleProfile = recommendStyle(input.instruction, input.style);
  const prompt = buildComposePrompt({
    text: input.text,
    instruction: input.instruction,
    language: input.language,
    template: input.template,
    styleProfile
  });

  const generated = await input.provider.generateStructured({
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
    temperature: 0.2,
    maxTokens: 4000
  });

  const composed = validateAiOutput(generated.content);

  return {
    ...composed,
    ai: {
      provider: input.provider.name,
      model: generated.model,
      usage: generated.usage
    }
  };
}
