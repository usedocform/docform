import { ValidationError } from "@docform/core";

export function requireObject<T extends object>(value: T | undefined): T {
  if (!value || typeof value !== "object") {
    throw new ValidationError("Request body must be a JSON object.");
  }

  return value;
}

export function requireString(value: unknown, name: string): string {
  const parsed = optionalString(value, name);
  if (!parsed) {
    throw new ValidationError(`Missing required field "${name}".`);
  }

  return parsed;
}

export function optionalString(value: unknown, name: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ValidationError(`Field "${name}" must be a string.`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
