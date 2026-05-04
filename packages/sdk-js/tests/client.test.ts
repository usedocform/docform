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

  it("sends the configured API key as a bearer token", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ templates: [] })));
    const authenticatedClient = createDocFormClient({
      baseUrl: "http://docform.local",
      apiKey: "local-secret",
      fetch: fetchMock
    });

    await authenticatedClient.listTemplates();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://docform.local/v1/templates",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer local-secret"
        })
      })
    );
  });

  it("maps S3 storage metadata from generate responses", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            document_id: "doc_123",
            status: "completed",
            format: "pdf",
            template: "minimal",
            file_path: "s3://docform-output/doc_123.pdf",
            storage: "s3",
            bucket: "docform-output",
            key: "doc_123.pdf",
            download_url: "https://storage.example.com/docform-output/doc_123.pdf?signature=test",
            stats: {
              pages: null
            }
          })
        )
    );
    const s3Client = createDocFormClient({
      baseUrl: "http://docform.local",
      fetch: fetchMock
    });

    const result = await s3Client.generateDocument({
      contentMarkdown: "# S3",
      format: "pdf"
    });

    expect(result).toMatchObject({
      documentId: "doc_123",
      filePath: "s3://docform-output/doc_123.pdf",
      storage: "s3",
      bucket: "docform-output",
      key: "doc_123.pdf",
      downloadUrl: "https://storage.example.com/docform-output/doc_123.pdf?signature=test"
    });
  });

  it("maps queued async generate responses", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            document_id: "doc_async",
            status: "queued"
          }),
          {
            status: 202
          }
        )
    );
    const asyncClient = createDocFormClient({
      baseUrl: "http://docform.local",
      fetch: fetchMock
    });

    const result = await asyncClient.generateDocument({
      mode: "async",
      contentMarkdown: "# Async",
      format: "pdf"
    });

    expect(result).toEqual({
      documentId: "doc_async",
      status: "queued"
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://docform.local/v1/documents/generate",
      expect.objectContaining({
        body: expect.stringContaining('"mode":"async"')
      })
    );
  });

  it("gets document status", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            document_id: "doc_async",
            status: "completed",
            format: "pdf",
            template: "minimal",
            file_path: "s3://docform-output/doc_async.pdf",
            storage: "s3",
            bucket: "docform-output",
            key: "doc_async.pdf",
            download_url: "https://storage.example.com/docform-output/doc_async.pdf?signature=test",
            stats: {
              pages: null
            }
          })
        )
    );
    const asyncClient = createDocFormClient({
      baseUrl: "http://docform.local",
      fetch: fetchMock
    });

    const result = await asyncClient.getDocumentStatus("doc_async");

    expect(result).toMatchObject({
      documentId: "doc_async",
      status: "completed",
      filePath: "s3://docform-output/doc_async.pdf",
      downloadUrl: "https://storage.example.com/docform-output/doc_async.pdf?signature=test"
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://docform.local/v1/documents/doc_async",
      expect.objectContaining({
        method: "GET"
      })
    );
  });

  it("requires baseUrl", () => {
    expect(() => createDocFormClient({ baseUrl: " " })).toThrow(DocFormSdkError);
  });
});
