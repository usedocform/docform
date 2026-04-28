import type { AiGenerateInput, AiGenerateResult, AiProvider } from "./ai-provider.js";

export type OpenAiCompatibleProviderOptions = {
  model?: string;
  baseUrl?: string;
  apiKey?: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
};

export class OpenAiCompatibleProvider implements AiProvider {
  readonly name = "openai-compatible";
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(options: OpenAiCompatibleProviderOptions = {}) {
    this.model = options.model ?? "gpt-4.1-mini";
    this.baseUrl = trimTrailingSlash(options.baseUrl ?? "https://api.openai.com/v1");
    this.apiKey = options.apiKey;
  }

  async generateStructured(input: AiGenerateInput): Promise<AiGenerateResult> {
    const headers: Record<string, string> = {
      "content-type": "application/json"
    };

    if (this.apiKey) {
      headers.authorization = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt }
        ],
        temperature: input.temperature ?? 0.2,
        max_tokens: input.maxTokens,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI-compatible provider failed with HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI-compatible provider returned an empty response.");
    }

    return {
      content: parseJsonContent(content),
      model: payload.model ?? this.model,
      usage:
        payload.usage?.prompt_tokens !== undefined && payload.usage.completion_tokens !== undefined
          ? {
              inputTokens: payload.usage.prompt_tokens,
              outputTokens: payload.usage.completion_tokens
            }
          : undefined
    };
  }
}

function parseJsonContent(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`AI provider returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
