import type { DocumentBlock, DocumentModel } from "../document-model/types.js";
import type { Template } from "../templates/registry.js";

export function renderHtml(model: DocumentModel, template: Template): string {
  const title = model.metadata.title ?? "Document";
  const body = model.blocks.map(renderBlock).join("\n");

  return `<!doctype html>
<html lang="${escapeAttribute(model.metadata.language ?? "en")}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
${template.styles}
    </style>
  </head>
  <body>
    <main class="docform-document">
${body}
    </main>
  </body>
</html>`;
}

function renderBlock(block: DocumentBlock): string {
  switch (block.type) {
    case "heading":
      return `      <h${block.level}>${escapeHtml(block.text)}</h${block.level}>`;
    case "paragraph":
      return `      <p>${escapeHtml(block.text)}</p>`;
    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      const items = block.items.map((item) => `        <li>${escapeHtml(item)}</li>`).join("\n");
      return `      <${tag}>\n${items}\n      </${tag}>`;
    }
    case "quote":
      return `      <blockquote>${escapeHtml(block.text)}</blockquote>`;
    case "code": {
      const language = block.language ? ` class="language-${escapeAttribute(block.language)}"` : "";
      return `      <pre><code${language}>${escapeHtml(block.code)}</code></pre>`;
    }
    case "table": {
      const header = block.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
      const rows = block.rows
        .map((row) => `        <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
        .join("\n");
      return `      <table>\n        <thead><tr>${header}</tr></thead>\n        <tbody>\n${rows}\n        </tbody>\n      </table>`;
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
