# DocForm

DocForm is a local document generation toolkit for turning Markdown into PDF documents through a core package, CLI, and local API.

## What Is Included In 0.1

- TypeScript monorepo with `packages/core`, `packages/ai`, `packages/cli`, and `packages/templates-basic`.
- Markdown to normalized `DocumentModel`.
- `DocumentModel` to HTML.
- HTML to PDF through Playwright/Chromium.
- Optional AI composition from raw text and an instruction into `DocumentModel`.
- One built-in template: `minimal`.
- CLI command: `docform generate`.
- Smoke test that verifies a non-empty PDF is created.

REST API, MCP, DOCX, Docker, cloud mode, auth, async jobs, premium templates, and dashboard are intentionally outside the 0.1 scope.

## What Is Included In 0.2

- Local REST API in `apps/api` powered by Fastify.
- `POST /v1/documents/generate` for Markdown to PDF.
- `POST /v1/documents/preview` for Markdown to HTML preview.
- `GET /v1/templates` and `GET /v1/templates/{id}`.
- Docker dev setup with Playwright/Chromium.

MCP, DOCX, cloud mode, auth, async jobs, premium templates, billing, and dashboard remain outside the 0.2 scope.

## Quick Start

This repository uses `pnpm@10.33.2`. The recommended way to make the `pnpm`
command available is Corepack:

```bash
corepack enable
corepack prepare pnpm@10.33.2 --activate
pnpm install
```

If Corepack is not available, install `pnpm` globally with npm:

```bash
npm install -g pnpm
pnpm install
```

You can also run the project without installing `pnpm` globally. `npm exec`
downloads and runs `pnpm` only for that command:

```bash
npm exec --yes pnpm@10.33.2 -- install
```

Install the Chromium browser used by Playwright:

```bash
pnpm --filter @docform/core exec playwright install chromium
```

With `npm exec`, the same command is:

```bash
npm exec --yes pnpm@10.33.2 -- --filter @docform/core exec playwright install chromium
```

Generate the example PDF:

```bash
pnpm --filter @docform/cli dev -- generate --input examples/markdown/report.md --template minimal --format pdf --output output/report.pdf
```

With `npm exec`, the same command is:

```bash
npm exec --yes pnpm@10.33.2 -- --filter @docform/cli dev -- generate --input examples/markdown/report.md --template minimal --format pdf --output output/report.pdf
```

## Local API

Run the API:

```bash
pnpm api
```

Generate a PDF through the API:

```bash
curl -X POST http://localhost:3000/v1/documents/generate \
  -H "content-type: application/json" \
  -d '{
    "format": "pdf",
    "template": "minimal",
    "content_markdown": "# API Report\n\nGenerated from the local API."
  }'
```

Generate an HTML preview:

```bash
curl -X POST http://localhost:3000/v1/documents/preview \
  -H "content-type: application/json" \
  -d '{
    "template": "minimal",
    "content_markdown": "# Preview\n\nGenerated from the local API."
  }'
```

List templates:

```bash
curl http://localhost:3000/v1/templates
```

Run the API with Docker dev:

```bash
pnpm api:docker
```

## AI Generation From CLI

AI generation is optional. Without AI flags, `docform generate` keeps using the regular Markdown pipeline.

Use `--ai-instruction` to ask DocForm to transform raw text before rendering:

```bash
DOCFORM_AI_API_KEY=your-api-key \
pnpm --filter @docform/cli dev -- generate \
  --input examples/markdown/report.md \
  --ai-instruction "make it office style" \
  --ai-provider openai-compatible \
  --ai-model gpt-4.1-mini \
  --ai-base-url https://api.openai.com/v1 \
  --template minimal \
  --format pdf \
  --output output/ai-report.pdf
```

Supported AI providers:

- `openai-compatible`: works with OpenAI-compatible HTTP APIs. Configure it with `--ai-model`, `--ai-base-url`, and `DOCFORM_AI_API_KEY`.
- `ollama`: local provider for Ollama. Use `--ai-base-url http://localhost:11434` and an Ollama model name.
- `mock`: test provider that does not call a real AI service.

You can pass AI settings as CLI flags or environment variables:

```bash
DOCFORM_AI_PROVIDER=openai-compatible
DOCFORM_AI_MODEL=gpt-4.1-mini
DOCFORM_AI_BASE_URL=https://api.openai.com/v1
DOCFORM_AI_API_KEY=your-api-key
```

CLI flags take priority over environment variables:

```bash
--ai
--ai-instruction "make it office style"
--ai-provider openai-compatible
--ai-model gpt-4.1-mini
--ai-base-url https://api.openai.com/v1
--ai-api-key your-api-key
--ai-style office
```

For local smoke testing without an API key:

```bash
pnpm --filter @docform/cli dev -- generate \
  --input examples/markdown/report.md \
  --ai-instruction "make it office style" \
  --ai-provider mock \
  --template minimal \
  --format pdf \
  --output output/mock-ai-report.pdf
```

## Definition Of Done

The first working version is ready when this command creates a valid, non-empty PDF:

```bash
docform generate --input examples/markdown/report.md --template minimal --format pdf --output output/report.pdf
```

For local development, the equivalent workspace command is:

```bash
pnpm --filter @docform/cli dev -- generate --input examples/markdown/report.md --template minimal --format pdf --output output/report.pdf
```

## Development

Run all tests:

```bash
pnpm test
```

Run TypeScript checks:

```bash
pnpm typecheck
```

Build packages:

```bash
pnpm build
```
