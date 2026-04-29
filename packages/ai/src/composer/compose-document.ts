import type { DocumentModel } from "@docform/core";
import { buildChunkComposePrompt } from "./build-chunk-compose-prompt.js";
import { buildComposePrompt } from "./build-compose-prompt.js";
import { buildReducePrompt } from "./build-reduce-prompt.js";
import type { AiTokenUsage } from "./compose-types.js";
import type { AiComposedDocument } from "./compose-types.js";
import { mergeComposedDocuments } from "./merge-composed-documents.js";
import { splitTextIntoChunks } from "./split-text-into-chunks.js";
import {
  defaultDocumentLimits,
  enforceDocumentLimits,
  type DocumentLimits
} from "../guardrails/enforce-document-limits.js";
import { AiOutputValidationError, validateAiOutput } from "../guardrails/validate-ai-output.js";
import type { AiGenerateResult } from "../providers/ai-provider.js";
import type { AiProvider } from "../providers/ai-provider.js";
import { recommendStyle } from "../style/recommend-style.js";
import type { StyleProfile } from "../style/style-profile.js";

export type LargeDocumentOptions = {
  enabled?: boolean;
  threshold?: number;
  chunkSize?: number;
  chunkOverlap?: number;
  maxConcurrentChunks?: number;
};

export type ComposeDocumentInput = {
  text: string;
  instruction: string;
  language?: "ru" | "en";
  template?: "auto" | string;
  style?: "office" | "formal" | "minimal" | "sales" | string;
  provider: AiProvider;
  largeDocument?: LargeDocumentOptions;
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

type ResolvedLargeDocumentOptions = {
  enabled: boolean;
  threshold: number;
  chunkSize: number;
  chunkOverlap: number;
  maxConcurrentChunks: number;
};

const defaultLargeDocumentOptions: ResolvedLargeDocumentOptions = {
  enabled: true,
  threshold: 24000,
  chunkSize: 12000,
  chunkOverlap: 800,
  maxConcurrentChunks: 1
};

const partialDocumentLimits: DocumentLimits = {
  maxBlocks: 24,
  maxTextLength: 6000,
  maxListItems: 25,
  maxTableRows: 50,
  maxTableColumns: defaultDocumentLimits.maxTableColumns
};

export async function composeDocument(input: ComposeDocumentInput): Promise<ComposeDocumentResult> {
  const styleProfile = recommendStyle(input.instruction, input.style);
  const largeDocument = resolveLargeDocumentOptions(input.largeDocument);

  if (largeDocument.enabled && input.text.length > largeDocument.threshold) {
    return composeLargeDocument(input, styleProfile, largeDocument);
  }

  return composeSingleDocument(input, styleProfile);
}

async function composeSingleDocument(input: ComposeDocumentInput, styleProfile: StyleProfile): Promise<ComposeDocumentResult> {
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

  return toComposeDocumentResult(input.provider, generated.model, composed, generated.usage);
}

async function composeLargeDocument(
  input: ComposeDocumentInput,
  styleProfile: StyleProfile,
  options: ResolvedLargeDocumentOptions
): Promise<ComposeDocumentResult> {
  const chunks = splitTextIntoChunks(input.text, options);
  const partials: AiComposedDocument[] = [];
  let model = input.provider.model;
  let usage: AiTokenUsage | undefined;

  for (let index = 0; index < chunks.length; index += options.maxConcurrentChunks) {
    const batch = chunks.slice(index, index + options.maxConcurrentChunks);
    const results = await Promise.all(batch.map((chunk) => composeChunk(input, styleProfile, chunk)));

    for (const result of results) {
      model = result.generated.model;
      usage = addTokenUsage(usage, result.generated.usage);
      partials.push(result.composed);
    }
  }

  const merged = mergeComposedDocuments(partials);

  try {
    enforceDocumentLimits(merged.document);
    return toComposeDocumentResult(input.provider, model, merged, usage);
  } catch (error) {
    if (!(error instanceof AiOutputValidationError)) {
      throw error;
    }
  }

  const reduced = await reduceComposedDocument(input, styleProfile, merged);
  usage = addTokenUsage(usage, reduced.generated.usage);

  return toComposeDocumentResult(input.provider, reduced.generated.model, reduced.composed, usage);
}

async function composeChunk(
  input: ComposeDocumentInput,
  styleProfile: StyleProfile,
  chunk: Parameters<typeof buildChunkComposePrompt>[0]["chunk"]
): Promise<{ composed: AiComposedDocument; generated: AiGenerateResult }> {
  const prompt = buildChunkComposePrompt({
    chunk,
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

  return {
    composed: validateAiOutput(generated.content, partialDocumentLimits),
    generated
  };
}

async function reduceComposedDocument(
  input: ComposeDocumentInput,
  styleProfile: StyleProfile,
  composed: AiComposedDocument
): Promise<{ composed: AiComposedDocument; generated: AiGenerateResult }> {
  const prompt = buildReducePrompt({
    document: composed.document,
    instruction: input.instruction,
    language: input.language,
    template: input.template,
    styleProfile,
    maxBlocks: defaultDocumentLimits.maxBlocks,
    maxTextLength: defaultDocumentLimits.maxTextLength
  });

  const generated = await input.provider.generateStructured({
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
    temperature: 0.2,
    maxTokens: 4000
  });

  return {
    composed: validateAiOutput(generated.content),
    generated
  };
}

function toComposeDocumentResult(
  provider: AiProvider,
  model: string,
  composed: AiComposedDocument,
  usage?: AiTokenUsage
): ComposeDocumentResult {
  return {
    ...composed,
    ai: {
      provider: provider.name,
      model,
      usage
    }
  };
}

function resolveLargeDocumentOptions(options: LargeDocumentOptions | undefined): ResolvedLargeDocumentOptions {
  return {
    enabled: options?.enabled ?? defaultLargeDocumentOptions.enabled,
    threshold: options?.threshold ?? defaultLargeDocumentOptions.threshold,
    chunkSize: options?.chunkSize ?? defaultLargeDocumentOptions.chunkSize,
    chunkOverlap: options?.chunkOverlap ?? defaultLargeDocumentOptions.chunkOverlap,
    maxConcurrentChunks: Math.max(1, Math.floor(options?.maxConcurrentChunks ?? defaultLargeDocumentOptions.maxConcurrentChunks))
  };
}

function addTokenUsage(current: AiTokenUsage | undefined, next: AiTokenUsage | undefined): AiTokenUsage | undefined {
  if (!current) {
    return next;
  }

  if (!next) {
    return current;
  }

  return {
    inputTokens: current.inputTokens + next.inputTokens,
    outputTokens: current.outputTokens + next.outputTokens
  };
}
