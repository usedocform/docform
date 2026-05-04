# @docform/cli

Create PDF and DOCX documents from Markdown directly from your terminal.

`@docform/cli` is the command-line entrypoint for DocForm. It is useful when you want to turn a Markdown file into a clean business document, run a local document generation API, or let an AI client create files through a local MCP server.

Use it for reports, proposals, notes, internal documents, AI-generated drafts, or any workflow where the content is text but the final result needs to be a shareable file.

## Install

Install the CLI from npm:

```bash
npm install -g @docform/cli
```

Check the available commands:

```bash
docform --help
```

DocForm uses Playwright/Chromium to render PDFs. If Chromium is not installed on your machine yet, install it once:

```bash
npx playwright install chromium
```

## Generate A Document

Start with a Markdown file:

```markdown
# Sales Report

Revenue grew by 18% this quarter.
```

Generate a PDF:

```bash
docform generate \
  --input report.md \
  --template minimal \
  --format pdf \
  --output output/report.pdf
```

Generate a DOCX file:

```bash
docform generate \
  --input report.md \
  --template minimal \
  --format docx \
  --output output/report.docx
```

The default template is `minimal`, and the default output format is `pdf`.

## Create A Custom Theme

Create a user theme scaffold:

```bash
docform new-theme company-report --name "Company Report"
```

The CLI creates:

```text
~/.docform/themes/company-report/template.json
~/.docform/themes/company-report/styles.css
```

Edit `template.json` to set document layout and design tokens:

```json
{
  "layout": {
    "header": {
      "content": "Company Report",
      "align": "left"
    },
    "footer": {
      "content": "Generated with DocForm",
      "align": "center"
    }
  },
  "design": {
    "primaryColor": "#2563eb",
    "textColor": "#1f2937",
    "backgroundColor": "#ffffff",
    "fontFamily": "Inter, ui-sans-serif, system-ui",
    "documentMaxWidth": "760px"
  }
}
```

Edit `styles.css` to style `.docform-page`, `.docform-header`, `.docform-document`, and `.docform-footer`. The design values are exposed as CSS variables such as `--docform-primary-color` and `--docform-document-max-width`.

Then use the theme by pointing DocForm at your user themes directory:

```bash
docform generate \
  --input report.md \
  --template company-report \
  --templates-root "$HOME/.docform/themes" \
  --format pdf \
  --output output/company-report.pdf
```

Built-in templates remain the default. Use `--templates-root` when you want a custom theme directory. Theme layout and CSS currently affect HTML and PDF output; DOCX uses the default Word renderer.

## Run A Local API

You can run DocForm as a local REST API when another app needs to generate documents.

```bash
docform serve --port 3000
```

Then call the API:

```bash
curl -X POST http://localhost:3000/v1/documents/generate \
  -H "content-type: application/json" \
  -d '{
    "format": "pdf",
    "template": "minimal",
    "content_markdown": "# API Report\n\nGenerated from a local DocForm API."
  }'
```

Use `"format": "docx"` to create a Word document through the same endpoint.

For self-hosted use, set `DOCFORM_OUTPUT_ROOT` for generated files and optionally `DOCFORM_API_KEY` to protect REST endpoints:

```bash
DOCFORM_OUTPUT_ROOT=/data/docform/output \
DOCFORM_API_KEY=local-secret \
docform serve --port 3000
```

When `DOCFORM_API_KEY` is set, call `/v1/*` endpoints with `Authorization: Bearer <key>` or `x-docform-api-key: <key>`. `/health` and `/ready` remain open for runtime checks.

## Use It With AI Tools

DocForm can also run as a local MCP server. This lets MCP-compatible AI clients ask DocForm to generate documents as tool calls.

```bash
docform mcp
```

Available MCP tools include:

- `generate_document`: create a PDF or DOCX from Markdown.
- `preview_document`: create an HTML preview.
- `list_templates`: list available templates.
- `get_template`: read metadata for one template.

### Add DocForm To An MCP Client

After installing `@docform/cli`, add DocForm as a stdio MCP server in your MCP client configuration:

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

If you prefer the MCP package binary, use:

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

AI composition is optional. You can ask an AI provider to rewrite or structure the input text before DocForm renders the final file.

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

Supported AI providers:

- `openai-compatible`: OpenAI-compatible HTTP APIs.
- `ollama`: local Ollama models.
- `mock`: a deterministic provider for local testing.

For a local smoke test without an API key:

```bash
docform generate \
  --input report.md \
  --ai-instruction "make it office style" \
  --ai-provider mock \
  --template minimal \
  --format pdf \
  --output output/mock-ai-report.pdf
```

## Command Reference

```bash
docform generate --input report.md --output output/report.pdf
docform generate --input report.md --format docx --output output/report.docx
docform new-theme company-report --name "Company Report"
docform serve --host 0.0.0.0 --port 3000
docform mcp
```

Useful options:

- `--template`: template id, defaults to `minimal`.
- `--format`: output format, `pdf` or `docx`.
- `--templates-root`: custom templates directory.
- `--output-root`: output directory for API and MCP flows.
- `--ai-instruction`: instruction for optional AI composition.

## Development From Source

Inside the DocForm monorepo, run the CLI in development mode:

```bash
pnpm --filter @docform/cli dev -- generate \
  --input examples/markdown/report.md \
  --template minimal \
  --format pdf \
  --output output/report.pdf
```

Related packages:

- `@docform/core`: Markdown, template, HTML, PDF, and DOCX rendering pipeline.
- `@docform/ai`: optional AI composition utilities.
- `@docform/api`: local REST API used by `docform serve`.
- `@docform/mcp-server`: local MCP server used by `docform mcp`.

## License

Apache-2.0
