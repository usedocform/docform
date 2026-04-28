export type AiGenerateInput = {
  systemPrompt: string;
  userPrompt: string;
  responseSchema?: unknown;
  temperature?: number;
  maxTokens?: number;
};

export type AiTokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type AiGenerateResult = {
  content: unknown;
  model: string;
  usage?: AiTokenUsage;
};

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  generateStructured(input: AiGenerateInput): Promise<AiGenerateResult>;
}
