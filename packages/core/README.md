# @docform/core

Core Markdown, template, HTML, and PDF rendering pipeline for DocForm.

This package parses Markdown into a normalized `DocumentModel`, renders it with a template, and produces PDF output through Playwright and Chromium.

## Usage

```ts
import { generateDocument } from "@docform/core";

await generateDocument({
  inputPath: "examples/markdown/report.md",
  outputPath: "output/report.pdf",
  templateId: "minimal",
  format: "pdf",
  templatesRoot: "packages/templates-basic/templates"
});
```

DocForm 0.1 supports PDF output.

## Rendering From A Model

```ts
import { generateDocumentFromModel } from "@docform/core";

await generateDocumentFromModel({
  model,
  outputPath: "output/report.pdf",
  templateId: "minimal",
  format: "pdf",
  templatesRoot: "packages/templates-basic/templates"
});
```
