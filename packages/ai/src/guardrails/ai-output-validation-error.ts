export class AiOutputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiOutputValidationError";
  }
}
