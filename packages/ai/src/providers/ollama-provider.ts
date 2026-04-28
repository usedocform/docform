import type { AiGenerateInput, AiGenerateResult, AiProvider } from "./ai-provider.js";

export type OllamaProviderOptions = {
  model?: string;
  baseUrl?: string;
};

type OllamaResponse = {
  model?: string;
  message?: {
    content?: string;
  };
  prompt_eval_count?: number;
  eval_count?: number;
};

export class OllamaProvider implements AiProvider {
  readonly name = "ollama";
  readonly model: string;
  private readonly baseUrl: string;

  constructor(options: OllamaProviderOptions = {}) {
    this.model = options.model ?? "llama3.1";
    this.baseUrl = trimTrailingSlash(options.baseUrl ?? "http://localhost:11434");
  }

  async generateStructured(input: AiGenerateInput): Promise<AiGenerateResult> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt }
        ],
        stream: false,
        format: "json",
        options: {
          temperature: input.temperature ?? 0.2,
          num_predict: input.maxTokens
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama provider failed with HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as OllamaResponse;
    const content = payload.message?.content;
    if (!content) {
      throw new Error("Ollama provider returned an empty response.");
    }

    return {
      content: parseJsonContent(content),
      model: payload.model ?? this.model,
      usage:
        payload.prompt_eval_count !== undefined && payload.eval_count !== undefined
          ? {
              inputTokens: payload.prompt_eval_count,
              outputTokens: payload.eval_count
            }
          : undefined
    };
  }
}

function parseJsonContent(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Ollama returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
