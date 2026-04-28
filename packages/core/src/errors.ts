export class DocFormError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "DocFormError";
  }
}

export class ValidationError extends DocFormError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message);
    this.name = "ValidationError";
  }
}

export class TemplateNotFoundError extends DocFormError {
  constructor(templateId: string) {
    super("TEMPLATE_NOT_FOUND", `Template "${templateId}" was not found.`);
    this.name = "TemplateNotFoundError";
  }
}
