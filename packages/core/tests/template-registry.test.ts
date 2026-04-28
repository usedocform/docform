import path from "node:path";
import { describe, expect, it } from "vitest";
import { TemplateNotFoundError } from "../src/errors.js";
import { TemplateRegistry } from "../src/templates/registry.js";

const templatesRoot = path.resolve(process.cwd(), "packages/templates-basic/templates");

describe("TemplateRegistry", () => {
  it("loads the minimal template", async () => {
    const registry = new TemplateRegistry(templatesRoot);
    const template = await registry.get("minimal");

    expect(template.manifest.id).toBe("minimal");
    expect(template.manifest.formats).toContain("pdf");
    expect(template.styles).toContain(".docform-document");
  });

  it("fails for unknown templates", async () => {
    const registry = new TemplateRegistry(templatesRoot);

    await expect(registry.get("missing")).rejects.toBeInstanceOf(TemplateNotFoundError);
  });
});
