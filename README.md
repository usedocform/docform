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

For longer generation flows, queue an async job and poll its status:

```bash
curl -X POST http://localhost:3000/v1/documents/generate \
  -H "content-type: application/json" \
  -d '{
    "mode": "async",
    "format": "pdf",
    "template": "minimal",
    "content_markdown": "# Sales Report\n\nRevenue grew by 18% this quarter."
  }'

curl http://localhost:3000/v1/documents/doc_123
```

Async jobs use BullMQ with Redis in self-hosted mode through `DOCFORM_REDIS_URL`. In production, the API enqueues jobs and a separate worker container consumes them. Job statuses are `queued`, `running`, `completed`, and `failed`.

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

Health and readiness checks are available for local and self-hosted runtimes:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

Set `DOCFORM_API_KEY` to protect REST endpoints. Health and readiness remain open for orchestration:

```bash
DOCFORM_API_KEY=local-secret docform serve --port 3000
curl http://localhost:3000/v1/templates \
  -H "Authorization: Bearer local-secret"
```

For Docker-based local development:

```bash
pnpm api:docker
```

For a production-oriented self-hosted container:

```bash
DOCFORM_API_KEY=local-secret pnpm api:docker:prod
```

Release builds publish the API image to GitHub Container Registry:

```text
ghcr.io/usedocform/docform-api:<tag>
ghcr.io/usedocform/docform-api:latest
```

Use a published image with compose:

```bash
DOCFORM_API_IMAGE=ghcr.io/usedocform/docform-api:v0.5.0 \
docker compose -f docker-compose.prod.yml up
```

If `DOCFORM_API_IMAGE` is not set, compose uses `ghcr.io/usedocform/docform-api:latest` and can still build from `infra/docker/prod/Dockerfile` when requested with `--build`.

The production compose file runs the API with Redis for async jobs and stores generated files in the `docform-output` volume at `/data/docform/output` inside the container. Override `DOCFORM_OUTPUT_ROOT` when running the API directly.

For custom themes in Docker, put theme folders under `./themes` and point the API at the mounted path:

```bash
DOCFORM_TEMPLATES_ROOT=/data/docform/themes pnpm api:docker:prod
```

Expected layout:

```text
themes/
  company-report/
    template.json
    styles.css
```

The production compose file mounts `./themes` to `/data/docform/themes:ro`. By default, `DOCFORM_TEMPLATES_ROOT` still points at bundled templates so `minimal` keeps working unless you opt into custom themes.

To store generated REST API documents in an S3-compatible backend instead of local disk, set the storage driver and S3 connection variables:

```bash
DOCFORM_STORAGE_DRIVER=s3 \
DOCFORM_S3_ENDPOINT=http://minio:9000 \
DOCFORM_S3_REGION=us-east-1 \
DOCFORM_S3_BUCKET=docform-output \
DOCFORM_S3_ACCESS_KEY_ID=minioadmin \
DOCFORM_S3_SECRET_ACCESS_KEY=minioadmin \
DOCFORM_S3_FORCE_PATH_STYLE=true \
DOCFORM_API_KEY=local-secret \
pnpm api:docker:prod
```

In S3 mode, `POST /v1/documents/generate` returns `file_path` as `s3://bucket/key` plus `storage`, `bucket`, `key`, and a presigned `download_url`. CLI and MCP output remain local.

## Custom Templates

Create a local theme when you need a branded header, footer, colors, typography, or page width:

```bash
docform new-theme company-report --name "Company Report"
docform generate \
  --input report.md \
  --template company-report \
  --templates-root "$HOME/.docform/themes" \
  --format pdf \
  --output output/company-report.pdf
```

Themes use `template.json` for layout/design tokens and `styles.css` for HTML/PDF styling. DOCX output currently uses the default Word renderer.

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

In self-hosted deployments, keep MCP local/stdio and point `DOCFORM_OUTPUT_ROOT` at a folder the user or host process can access.

### Add DocForm To An MCP Client

After installing the CLI, add DocForm as a stdio MCP server in your MCP client configuration:

```json
{
  "mcpServers": {
    "docform": {
      "command": "docform",
      "args": ["mcp"],
      "env": {
        "DOCFORM_OUTPUT_ROOT": "${workspaceFolder}/output"
      }
    }
  }
}
```

If you use the MCP package binary directly, the config can be even shorter:

```json
{
  "mcpServers": {
    "docform": {
      "command": "docform-mcp"
    }
  }
}
```

Use an absolute `DOCFORM_OUTPUT_ROOT` when you want generated files to appear in a predictable folder.

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
