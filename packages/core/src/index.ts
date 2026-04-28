export type { DocumentBlock, DocumentModel } from "./document-model/types.js";
export { DocFormError, TemplateNotFoundError, ValidationError } from "./errors.js";
export {
  generateDocument,
  generateDocumentFromModel,
  type GenerateDocumentFromModelOptions,
  type GenerateDocumentOptions
} from "./generate.js";
export { parseMarkdown } from "./input/markdown.js";
export { renderHtml } from "./renderers/html.js";
export { renderPdf } from "./renderers/pdf.js";
export { TemplateRegistry, type Template, type TemplateManifest } from "./templates/registry.js";
export {
  assertRequiredPath,
  assertSupportedFormat,
  assertValidDocumentModel,
  type OutputFormat
} from "./validation.js";
