# DocForm

Turn Markdown and AI-written text into clean PDF, DOCX, and HTML documents.

DocForm is a local-first document generation toolkit for developers, AI agents, and self-hosted apps. Write content in Markdown, choose a template, and get a ready-to-share business document without hand-tuning HTML, CSS, Word files, or browser rendering.

## Why DocForm?

Most apps eventually need the same thing: a polished report, proposal, invoice, summary, or internal document generated from structured data or text. DocForm gives you one generation path that works from the command line, a local REST API, and an MCP server for AI tools.

Use it when you want to:

- generate PDF or DOCX files from Markdown;
- preview a document as HTML before exporting it;
- let an AI agent create files through MCP;
- run document generation locally without a hosted service;
- build your own document workflow on top of a reusable TypeScript core.

The current open-source MVP includes CLI generation, a local Fastify API, a local MCP server, DOCX export, PDF rendering through Playwright/Chromium, and the built-in `minimal` template.

## Install From npm

Install the CLI globally:

```bash
npm install -g @docform/cli
```

Then generate a document:

```bash
docform generate \
  --input report.md \
  --template minimal \
  --format pdf \
  --output output/report.pdf
```

For DOCX output, change the format:

```bash
docform generate \
  --input report.md \
  --template minimal \
  --format docx \
  --output output/report.docx
```

DocForm uses Playwright/Chromium for PDF rendering. If Chromium is not installed yet, install it once:

```bash
npx playwright install chromium
```

You can also use the core package directly in your own app:

```bash
npm install @docform/core
```

## Quick Start From Source

This repository uses `pnpm@10.33.2`. Enable Corepack, install dependencies, and install Chromium:

```bash
corepack enable
corepack prepare pnpm@10.33.2 --activate
pnpm install
pnpm --filter @docform/core exec playwright install chromium
```

Generate the example PDF:

```bash
pnpm --filter @docform/cli dev -- generate \
  --input examples/markdown/report.md \
  --template minimal \
  --format pdf \
  --output output/report.pdf
```

Generate the example DOCX:

```bash
pnpm --filter @docform/cli dev -- generate \
  --input examples/markdown/report.md \
  --template minimal \
  --format docx \
  --output output/report.docx
```

## Local REST API

Run DocForm as a local API:

```bash
docform serve --port 3000
```

In the source workspace, use:

```bash
pnpm --filter @docform/cli dev -- serve --port 3000
```

Generate a PDF or DOCX:

```bash
curl -X POST http://localhost:3000/v1/documents/generate \
  -H "content-type: application/json" \
  -d '{
    "format": "pdf",
    "template": "minimal",
    "content_markdown": "# Sales Report\n\nRevenue grew by 18% this quarter."
  }'
```

Use `"format": "docx"` to create a Word document through the same endpoint.

Create an HTML preview:

```bash
curl -X POST http://localhost:3000/v1/documents/preview \
  -H "content-type: application/json" \
  -d '{
    "template": "minimal",
    "content_markdown": "# Preview\n\nCheck the document before exporting."
  }'
```

List available templates:

```bash
curl http://localhost:3000/v1/templates
```

For Docker-based local development:

```bash
pnpm api:docker
```

## Local MCP Server

DocForm can run as a local MCP server so AI clients can create documents as tools.

```bash
docform mcp
```

In the source workspace, use:

```bash
pnpm --filter @docform/cli dev -- mcp
```

Available MCP tools:

- `generate_document`: creates a local PDF or DOCX from Markdown.
- `preview_document`: returns an HTML preview.
- `list_templates`: lists available templates.
- `get_template`: returns metadata for one template.

Example `generate_document` input:

```json
{
  "format": "docx",
  "template": "minimal",
  "content_markdown": "# Proposal\n\nGenerated locally by an AI agent."
}
```

Set `DOCFORM_TEMPLATES_ROOT` or `DOCFORM_OUTPUT_ROOT` when you need custom local paths.

## Optional AI Composition

DocForm can optionally ask an AI provider to transform raw text before rendering. Without AI flags, `docform generate` uses the regular Markdown pipeline.

```bash
DOCFORM_AI_API_KEY=your-api-key \
docform generate \
  --input report.md \
  --ai-instruction "make it concise and business-ready" \
  --ai-provider openai-compatible \
  --ai-model gpt-4.1-mini \
  --ai-base-url https://api.openai.com/v1 \
  --template minimal \
  --format pdf \
  --output output/ai-report.pdf
```

Supported providers:

- `openai-compatible`: any OpenAI-compatible HTTP API.
- `ollama`: local Ollama models for privacy-first workflows.
- `mock`: deterministic test provider that does not call a real AI service.

For local testing without an API key:

```bash
pnpm --filter @docform/cli dev -- generate \
  --input examples/markdown/report.md \
  --ai-instruction "make it office style" \
  --ai-provider mock \
  --template minimal \
  --format pdf \
  --output output/mock-ai-report.pdf
```

## What Is Included

DocForm currently includes:

- TypeScript monorepo with shared core, CLI, API, MCP server, templates, and optional AI package.
- Markdown to normalized `DocumentModel`.
- `DocumentModel` to HTML preview, PDF, and DOCX.
- PDF rendering through Playwright/Chromium.
- Local REST API: generate, preview, and templates endpoints.
- Local MCP server over stdio.
- Built-in `minimal` template.
- Smoke, API, and MCP tests for the main generation flows.

Not included yet: hosted cloud mode, auth, async jobs, billing, dashboard, long-term cloud storage, and premium templates.

## Development

Run tests:

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

## License

DocForm is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.
