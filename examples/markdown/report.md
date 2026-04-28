# DocForm 0.1 Report

This report verifies the first walking skeleton for local PDF generation.

## Summary

- Markdown input is parsed into a normalized document model.
- The minimal template renders HTML.
- Playwright writes the final PDF file.

> DocForm 0.1 focuses only on the Markdown to PDF critical path.

## Metrics

| Area | Status |
| --- | --- |
| Core pipeline | Ready |
| Minimal template | Ready |
| CLI generate command | Ready |

## Example Code

```ts
const output = "output/report.pdf";
```
