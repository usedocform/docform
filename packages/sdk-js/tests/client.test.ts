import { mkdtemp, rm, stat } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiServer } from "../../../apps/api/src/server.js";
import { createDocFormClient, DocFormSdkError, type DocFormClient, type DocumentFormat } from "../src/index.js";

const templatesRoot = path.resolve(process.cwd(), "packages/templates-basic/templates");

describe("DocForm SDK JS", () => {
  let server: ReturnType<typeof createApiServer>;
  let outputRoot: string;
  let client: DocFormClient;

  beforeEach(async () => {
    outputRoot = await mkdtemp(path.join(tmpdir(), "docform-sdk-"));
    server = createApiServer({ templatesRoot, outputRoot });
    await server.listen({ port: 0 });
    const address = server.server.address() as AddressInfo;
    client = createDocFormClient({ baseUrl: `http://127.0.0.1:${address.port}/` });
  });

  afterEach(async () => {
    await server.close();
    await rm(outputRoot, { recursive: true, force: true });
  });

  it("generates a PDF through the REST API", async () => {
    const result = await client.generateDocument({
      contentMarkdown: "# SDK PDF\n\nGenerated from SDK.",
      template: "minimal",
      format: "pdf"
    });

    expect(result.documentId).toMatch(/^doc_/);
    expect(result.status).toBe("completed");
    expect(result.format).toBe("pdf");
    expect(result.template).toBe("minimal");
    expect(result.filePath).toMatch(/\.pdf$/);

    const pdfStat = await stat(path.resolve(process.cwd(), result.filePath));
    expect(pdfStat.size).toBeGreaterThan(0);
  });

  it("generates a DOCX through the REST API", async () => {
    const result = await client.generateDocument({
      contentMarkdown: "# SDK DOCX\n\nGenerated from SDK.",
      template: "minimal",
      format: "docx"
    });

    expect(result.documentId).toMatch(/^doc_/);
    expect(result.status).toBe("completed");
    expect(result.format).toBe("docx");
    expect(result.filePath).toMatch(/\.docx$/);

    const docxStat = await stat(path.resolve(process.cwd(), result.filePath));
    expect(docxStat.size).toBeGreaterThan(0);
  });

  it("returns HTML preview", async () => {
    const result = await client.previewDocument({
      contentMarkdown: "# SDK Preview\n\nHello.",
      template: "minimal"
    });

    expect(result.documentId).toMatch(/^preview_/);
    expect(result.status).toBe("completed");
    expect(result.format).toBe("html");
    expect(result.template).toBe("minimal");
    expect(result.html).toContain("<h1>SDK Preview</h1>");
  });

  it("lists templates", async () => {
    const templates = await client.listTemplates();

    expect(templates).toContainEqual(
      expect.objectContaining({
        id: "minimal",
        name: "Minimal",
        formats: expect.arrayContaining(["pdf", "docx", "html"]),
        source: "basic"
      })
    );
  });

  it("returns template details", async () => {
    const template = await client.getTemplate("minimal");

    expect(template).toMatchObject({
      id: "minimal",
      name: "Minimal",
      source: "basic"
    });
    expect(template.defaultOptions).toBeDefined();
  });

  it("maps API validation errors", async () => {
    await expect(
      client.generateDocument({
        contentMarkdown: "# Invalid",
        template: "minimal",
        format: "txt" as unknown as DocumentFormat
      })
    ).rejects.toMatchObject({
      name: "DocFormSdkError",
      code: "VALIDATION_ERROR",
      status: 400
    });
  });

  it("maps network errors", async () => {
    const failingFetch = vi.fn(async () => {
      throw new Error("connection refused");
    });
    const failingClient = createDocFormClient({
      baseUrl: "http://127.0.0.1:1",
      fetch: failingFetch
    });

    await expect(
      failingClient.previewDocument({
        contentMarkdown: "# Preview"
      })
    ).rejects.toMatchObject({
      name: "DocFormSdkError",
      code: "NETWORK_ERROR"
    });
  });

  it("requires baseUrl", () => {
    expect(() => createDocFormClient({ baseUrl: " " })).toThrow(DocFormSdkError);
  });
});
