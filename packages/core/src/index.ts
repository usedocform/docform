export type { DocumentBlock, DocumentModel } from "./document-model/types.js";
export { DocFormError, TemplateNotFoundError, ValidationError } from "./errors.js";
export {
  generateDocument,
  generateDocumentFromMarkdown,
  generateDocumentFromModel,
  type GenerateDocumentFromModelOptions,
  type GenerateDocumentFromMarkdownOptions,
  type GenerateDocumentOptions
} from "./generate.js";
export { renderHtmlFromMarkdown } from "./generate.js";
export { parseMarkdown } from "./input/markdown.js";
export { renderDocx } from "./renderers/docx.js";
export { renderHtml } from "./renderers/html.js";
export { renderPdf } from "./renderers/pdf.js";
export { TemplateRegistry, type Template, type TemplateManifest } from "./templates/registry.js";
export {
  assertRequiredPath,
  assertSupportedFormat,
  assertValidDocumentModel,
  type OutputFormat
} from "./validation.js";
