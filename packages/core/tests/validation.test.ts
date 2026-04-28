import { describe, expect, it } from "vitest";
import { ValidationError } from "../src/errors.js";
import { assertSupportedFormat, assertValidDocumentModel } from "../src/validation.js";

describe("assertSupportedFormat", () => {
  it("accepts pdf", () => {
    expect(() => assertSupportedFormat("pdf")).not.toThrow();
  });

  it("rejects unsupported formats in v0.1", () => {
    expect(() => assertSupportedFormat("docx")).toThrow(ValidationError);
  });
});

describe("assertValidDocumentModel", () => {
  it("accepts a supported document model", () => {
    expect(() =>
      assertValidDocumentModel({
        metadata: { title: "Report" },
        blocks: [{ type: "paragraph", text: "Hello" }]
      })
    ).not.toThrow();
  });

  it("rejects empty documents", () => {
    expect(() => assertValidDocumentModel({ metadata: {}, blocks: [] })).toThrow(ValidationError);
  });
});
