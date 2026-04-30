import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { TemplateNotFoundError, ValidationError } from "../errors.js";

export type TemplateFormat = "pdf" | "html";

export type TemplateManifest = {
  id: string;
  name: string;
  version: string;
  formats: TemplateFormat[];
  defaultOptions?: {
    pageSize?: string;
    margin?: string;
  };
};

export type Template = {
  manifest: TemplateManifest;
  styles: string;
  directory: string;
};

export class TemplateRegistry {
  constructor(private readonly templatesRoot: string) {}

  async list(): Promise<TemplateManifest[]> {
    const entries = await readdir(this.templatesRoot, { withFileTypes: true });
    const templates: Template[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      try {
        templates.push(await this.get(entry.name));
      } catch (error) {
        if (!(error instanceof TemplateNotFoundError)) {
          throw error;
        }
      }
    }

    return templates.map((template) => template.manifest);
  }

  async get(templateId: string): Promise<Template> {
    const directory = path.join(this.templatesRoot, templateId);

    try {
      const [manifestJson, styles] = await Promise.all([
        readFile(path.join(directory, "template.json"), "utf8"),
        readFile(path.join(directory, "styles.css"), "utf8")
      ]);
      const manifest = parseTemplateManifest(JSON.parse(manifestJson));

      if (manifest.id !== templateId) {
        throw new ValidationError(`Template manifest id "${manifest.id}" does not match "${templateId}".`);
      }

      return { manifest, styles, directory };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      throw new TemplateNotFoundError(templateId);
    }
  }
}

function parseTemplateManifest(value: unknown): TemplateManifest {
  if (!value || typeof value !== "object") {
    throw new ValidationError("Template manifest must be an object.");
  }

  const manifest = value as Partial<TemplateManifest>;
  if (!manifest.id || !manifest.name || !manifest.version || !Array.isArray(manifest.formats)) {
    throw new ValidationError("Template manifest is missing required fields.");
  }

  if (!manifest.formats.every((format) => format === "pdf" || format === "html")) {
    throw new ValidationError("Template manifest contains an unsupported format.");
  }

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    formats: manifest.formats,
    defaultOptions: manifest.defaultOptions
  };
}
