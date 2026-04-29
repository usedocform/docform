export {
  composeDocument,
  type ComposeDocumentInput,
  type ComposeDocumentResult,
  type LargeDocumentOptions
} from "./composer/compose-document.js";
export { buildComposePrompt } from "./composer/build-compose-prompt.js";
export { splitTextIntoChunks, type TextChunk, type SplitTextIntoChunksOptions } from "./composer/split-text-into-chunks.js";
export type { AiComposedDocument, AiTokenUsage } from "./composer/compose-types.js";
export { AiOutputValidationError, validateAiOutput } from "./guardrails/validate-ai-output.js";
export { enforceDocumentLimits, type DocumentLimits } from "./guardrails/enforce-document-limits.js";
export { sanitizeAiContent } from "./guardrails/sanitize-ai-content.js";
export {
  createAiProvider,
  resolveAiProviderConfig,
  type AiProviderConfig,
  type AiProviderName
} from "./providers/provider-factory.js";
export type { AiGenerateInput, AiGenerateResult, AiProvider } from "./providers/ai-provider.js";
export { MockAiProvider, type MockAiProviderOptions } from "./providers/mock-provider.js";
export { OllamaProvider, type OllamaProviderOptions } from "./providers/ollama-provider.js";
export {
  OpenAiCompatibleProvider,
  type OpenAiCompatibleProviderOptions
} from "./providers/openai-compatible-provider.js";
export { recommendStyle } from "./style/recommend-style.js";
export type { StyleProfile, StyleTone } from "./style/style-profile.js";
