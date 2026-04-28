import { MockAiProvider } from "./mock-provider.js";
import { OllamaProvider } from "./ollama-provider.js";
import { OpenAiCompatibleProvider } from "./openai-compatible-provider.js";
import type { AiProvider } from "./ai-provider.js";

export type AiProviderName = "openai-compatible" | "ollama" | "mock";

export type AiProviderConfig = {
  provider?: AiProviderName;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  mockContent?: unknown;
};

type ResolvedAiProviderConfig = Omit<AiProviderConfig, "provider"> & {
  provider: AiProviderName;
};

type AiProviderEnv = Partial<
  Record<"DOCFORM_AI_PROVIDER" | "DOCFORM_AI_MODEL" | "DOCFORM_AI_BASE_URL" | "DOCFORM_AI_API_KEY", string | undefined>
>;

export function resolveAiProviderConfig(config: AiProviderConfig, env: AiProviderEnv = process.env): ResolvedAiProviderConfig {
  return {
    provider: config.provider ?? parseProviderName(env.DOCFORM_AI_PROVIDER) ?? "openai-compatible",
    model: config.model ?? env.DOCFORM_AI_MODEL,
    baseUrl: config.baseUrl ?? env.DOCFORM_AI_BASE_URL,
    apiKey: config.apiKey ?? env.DOCFORM_AI_API_KEY,
    mockContent: config.mockContent
  };
}

export function createAiProvider(config: AiProviderConfig): AiProvider {
  const resolved = resolveAiProviderConfig(config);

  switch (resolved.provider) {
    case "mock":
      return new MockAiProvider({ model: resolved.model, content: resolved.mockContent });
    case "ollama":
      return new OllamaProvider({ model: resolved.model, baseUrl: resolved.baseUrl });
    case "openai-compatible":
      return new OpenAiCompatibleProvider({
        model: resolved.model,
        baseUrl: resolved.baseUrl,
        apiKey: resolved.apiKey
      });
  }
}

function parseProviderName(value: string | undefined): AiProviderName | undefined {
  if (!value) {
    return undefined;
  }

  if (value === "openai-compatible" || value === "ollama" || value === "mock") {
    return value;
  }

  throw new Error(`Unsupported AI provider "${value}".`);
}
