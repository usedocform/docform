# @docform/mcp-server

Let AI tools create PDF and DOCX documents with DocForm.

`@docform/mcp-server` is a local MCP server for DocForm. It gives MCP-compatible clients a small set of document tools: generate a file from Markdown, preview Markdown as HTML, and inspect available templates.

Use it when you want an AI assistant to turn a draft, report, proposal, or structured Markdown into a real document on your machine.

## What It Does

The server runs locally over stdio and calls DocForm core under the hood.

```text
AI client -> MCP tool -> DocForm core -> PDF / DOCX / HTML preview
```

This means your local MCP client can ask DocForm to:

- create a PDF from Markdown;
- create a DOCX from Markdown;
- return an HTML preview;
- list available templates;
- read metadata for one template.

Generated files are saved to the local output directory.

## Run It

If you use the DocForm CLI, start the MCP server with:

```bash
docform mcp
```

You can also run the MCP package binary directly:

```bash
docform-mcp
```

From the source workspace, use:

```bash
pnpm --filter @docform/mcp-server dev
```

Or through the CLI package:

```bash
pnpm --filter @docform/cli dev -- mcp
```

## Available Tools

### `generate_document`

Creates a PDF or DOCX document from Markdown.

```json
{
  "format": "pdf",
  "template": "minimal",
  "content_markdown": "# Proposal\n\nGenerated locally with DocForm.",
  "output_path": "output/proposal.pdf"
}
```

Fields:

- `content_markdown` is required.
- `format` can be `pdf` or `docx`; default is `pdf`.
- `template` defaults to `minimal`.
- `output_path` is optional. If omitted, DocForm creates a file in the output directory.

Example response:

```json
{
  "status": "completed",
  "format": "pdf",
  "template": "minimal",
  "file_path": "output/proposal.pdf"
}
```

### `preview_document`

Renders Markdown as an HTML preview.

```json
{
  "template": "minimal",
  "content_markdown": "# Preview\n\nCheck the document before exporting."
}
```

### `list_templates`

Lists templates available to the local DocForm template registry.

```json
{}
```

### `get_template`

Returns metadata for one template.

```json
{
  "template": "minimal"
}
```

## Configure Paths

By default, the server looks for templates in `packages/templates-basic/templates` and writes generated files to `output`.

Use environment variables when you need custom paths:

```bash
DOCFORM_TEMPLATES_ROOT=/path/to/templates
DOCFORM_OUTPUT_ROOT=/path/to/output
docform mcp
```

When the server is started through the CLI, you can also pass flags:

```bash
docform mcp \
  --templates-root /path/to/templates \
  --output-root /path/to/output
```

## MCP Client Example

Add the server to an MCP-compatible client as a stdio command.

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

If you prefer the package binary:

```json
{
  "mcpServers": {
    "docform": {
      "command": "docform-mcp"
    }
  }
}
```

## Development

Build the package:

```bash
pnpm --filter @docform/mcp-server build
```

Run tests:

```bash
pnpm --filter @docform/mcp-server test
```

Related packages:

- `@docform/core`: document generation engine used by the MCP tools.
- `@docform/cli`: exposes the same server through `docform mcp`.

## License

Apache-2.0
