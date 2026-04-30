# @docform/cli

Command-line interface for generating documents and starting local DocForm services.

## Usage

```bash
docform generate --input examples/markdown/report.md --template minimal --format pdf --output output/report.pdf
docform generate --input examples/markdown/report.md --template minimal --format docx --output output/report.docx
docform serve --port 3000
docform mcp
```

DocForm supports Markdown input, the `minimal` template, PDF/DOCX output, the local REST API, and the local MCP server.

## AI Composition

AI composition is optional. Use `--ai-instruction` with an AI provider to transform raw text before rendering:

```bash
DOCFORM_AI_API_KEY=your-api-key \
docform generate \
  --input examples/markdown/report.md \
  --ai-instruction "make it office style" \
  --ai-provider openai-compatible \
  --ai-model gpt-4.1-mini \
  --ai-base-url https://api.openai.com/v1 \
  --template minimal \
  --format pdf \
  --output output/ai-report.pdf
```

Supported AI providers are `openai-compatible`, `ollama`, and `mock`.

## Related Packages

- `@docform/core`: Markdown, template, HTML, PDF, and DOCX rendering pipeline.
- `@docform/ai`: AI composition utilities for DocForm.
- `@docform/api`: local REST API used by `docform serve`.
- `@docform/mcp-server`: local MCP server used by `docform mcp`.
