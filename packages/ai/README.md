# @docform/ai

AI composition utilities for DocForm document generation.

This package turns raw text plus an instruction into a normalized DocForm `DocumentModel`, then validates and sanitizes the AI output before it is rendered by `@docform/core`.

## Providers

Supported providers:

- `openai-compatible`: OpenAI-compatible HTTP APIs.
- `ollama`: local Ollama API.
- `mock`: deterministic provider for tests and local smoke checks.

## Usage

```ts
import { composeDocument, createAiProvider } from "@docform/ai";

const provider = createAiProvider({
  provider: "openai-compatible",
  model: "gpt-4.1-mini",
  baseUrl: "https://api.openai.com/v1",
  apiKey: process.env.DOCFORM_AI_API_KEY
});

const result = await composeDocument({
  text: "Quarterly results and key risks...",
  instruction: "make it office style",
  template: "minimal",
  provider
});
```

Use the returned `document` with `generateDocumentFromModel` from `@docform/core`.

## Large documents

`composeDocument` automatically switches to a chunked map-reduce flow when `text` is larger than the default threshold. This keeps long inputs, such as multi-page reports, away from provider context limits while preserving the same returned `DocumentModel` shape.

```ts
const result = await composeDocument({
  text: longReportText,
  instruction: "summarize and format as an office report",
  template: "minimal",
  provider,
  largeDocument: {
    threshold: 24_000,
    chunkSize: 12_000,
    chunkOverlap: 800
  }
});
```

No extra runtime dependencies are required for large-document handling.
