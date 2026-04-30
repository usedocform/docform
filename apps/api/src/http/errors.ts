import type { FastifyReply } from "fastify";
import { DocFormError, TemplateNotFoundError, ValidationError } from "@docform/core";

type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

type ErrorWithStatusCode = {
  statusCode?: number;
  message?: string;
};

export function writeError(reply: FastifyReply, error: unknown, statusCode?: number): void {
  reply.status(statusCode ?? statusCodeForError(error)).send(toErrorResponse(error));
}

function toErrorResponse(error: unknown): ApiErrorResponse {
  if (error instanceof DocFormError) {
    return {
      error: {
        code: error.code,
        message: error.message
      }
    };
  }

  if (isClientError(error)) {
    return {
      error: {
        code: "VALIDATION_ERROR",
        message: error.message ?? "Invalid request."
      }
    };
  }

  const message = error instanceof Error ? error.message : "Unexpected server error.";
  return {
    error: {
      code: "INTERNAL_ERROR",
      message
    }
  };
}

function statusCodeForError(error: unknown): number {
  if (error instanceof TemplateNotFoundError) {
    return 404;
  }

  if (error instanceof ValidationError) {
    return 400;
  }

  if (error instanceof DocFormError) {
    return 400;
  }

  if (isErrorWithStatusCode(error)) {
    return error.statusCode ?? 500;
  }

  return 500;
}

function isClientError(error: unknown): error is ErrorWithStatusCode {
  return isErrorWithStatusCode(error) && (error.statusCode ?? 500) >= 400 && (error.statusCode ?? 500) < 500;
}

function isErrorWithStatusCode(error: unknown): error is ErrorWithStatusCode {
  return Boolean(error && typeof error === "object" && "statusCode" in error);
}
