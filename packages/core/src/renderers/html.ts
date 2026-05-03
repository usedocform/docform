import type { DocumentBlock, DocumentModel } from "../document-model/types.js";
import type { Template, TemplateLayoutSlot } from "../templates/registry.js";

export function renderHtml(model: DocumentModel, template: Template): string {
  const title = model.metadata.title ?? "Document";
  const body = model.blocks.map(renderBlock).join("\n");
  const designStyles = renderDesignStyles(template);
  const header = renderLayoutSlot("header", template.manifest.layout?.header);
  const footer = renderLayoutSlot("footer", template.manifest.layout?.footer);

  return `<!doctype html>
<html lang="${escapeAttribute(model.metadata.language ?? "en")}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
${designStyles}
${template.styles}
    </style>
  </head>
  <body>
    <div class="docform-page">
${header}
      <main class="docform-document">
${body}
      </main>
${footer}
    </div>
  </body>
</html>`;
}

function renderDesignStyles(template: Template): string {
  const design = template.manifest.design;
  if (!design) {
    return "";
  }

  const declarations = [
    renderCssVariable("--docform-primary-color", design.primaryColor),
    renderCssVariable("--docform-text-color", design.textColor),
    renderCssVariable("--docform-background-color", design.backgroundColor),
    renderCssVariable("--docform-font-family", design.fontFamily),
    renderCssVariable("--docform-document-max-width", design.documentMaxWidth)
  ].filter(Boolean);

  return declarations.length > 0 ? `:root {\n${declarations.join("\n")}\n}\n` : "";
}

function renderCssVariable(name: string, value: string | undefined): string | undefined {
  if (!value || !isSafeCssValue(value)) {
    return undefined;
  }

  return `  ${name}: ${value};`;
}

function isSafeCssValue(value: string): boolean {
  return !/[{};<>]/.test(value);
}

function renderLayoutSlot(slot: "header" | "footer", value: TemplateLayoutSlot | undefined): string {
  if (!value || value.visible === false || !value.content) {
    return "";
  }

  const align = value.align ?? "left";
  const customClass = renderCustomClass(value.className);
  const className = `docform-${slot} docform-align-${align}${customClass ? ` ${customClass}` : ""}`;
  const tag = slot === "header" ? "header" : "footer";

  return `      <${tag} class="${escapeAttribute(className)}">${escapeTextWithLineBreaks(value.content)}</${tag}>`;
}

function renderCustomClass(value: string | undefined): string | undefined {
  if (!value || !/^[A-Za-z0-9_-]+(?:\s+[A-Za-z0-9_-]+)*$/.test(value)) {
    return undefined;
  }

  return value;
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

function escapeTextWithLineBreaks(value: string): string {
  return value.split(/\r?\n/).map(escapeHtml).join("<br />");
}
