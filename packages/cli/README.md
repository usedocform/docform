# @docform/cli

Command-line interface for generating PDF documents with DocForm.

## Usage

```bash
docform generate --input examples/markdown/report.md --template minimal --format pdf --output output/report.pdf
```

DocForm 0.1 supports Markdown input, the `minimal` template, and PDF output.

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

- `@docform/core`: Markdown, template, HTML, and PDF rendering pipeline.
- `@docform/ai`: AI composition utilities for DocForm.
