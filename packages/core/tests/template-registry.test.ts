import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
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
    expect(template.manifest.formats).toContain("docx");
    expect(template.manifest.layout?.header?.content).toBe("DocForm");
    expect(template.manifest.layout?.footer?.align).toBe("center");
    expect(template.manifest.design?.primaryColor).toBe("#2563eb");
    expect(template.styles).toContain(".docform-document");
  });

  it("loads templates without layout or design fields", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "docform-templates-"));
    const templateRoot = path.join(root, "legacy");
    await mkdir(templateRoot);
    await Promise.all([
      writeFile(
        path.join(templateRoot, "template.json"),
        JSON.stringify({
          id: "legacy",
          name: "Legacy",
          version: "0.1.0",
          formats: ["pdf"]
        }),
        "utf8"
      ),
      writeFile(path.join(templateRoot, "styles.css"), ".docform-document { color: black; }", "utf8")
    ]);

    const registry = new TemplateRegistry(root);
    const template = await registry.get("legacy");

    expect(template.manifest.layout).toBeUndefined();
    expect(template.manifest.design).toBeUndefined();
  });

  it("fails for unknown templates", async () => {
    const registry = new TemplateRegistry(templatesRoot);

    await expect(registry.get("missing")).rejects.toBeInstanceOf(TemplateNotFoundError);
  });
});
