import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InMemoryGenerateJobStore, type GenerateJobStore } from "../src/jobs.js";
import { createApiServer } from "../src/server.js";
import type { DocumentStorage } from "../src/storage.js";

const templatesRoot = path.resolve(process.cwd(), "packages/templates-basic/templates");

describe("DocForm API", () => {
  let server: FastifyInstance;
  let baseUrl: string;
  let outputRoot: string;

  beforeEach(async () => {
    outputRoot = await mkdtemp(path.join(tmpdir(), "docform-api-"));
    server = createApiServer({ templatesRoot, outputRoot });
    await server.listen({ port: 0 });
    const address = server.server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await server.close();
    await rm(outputRoot, { recursive: true, force: true });
  });

  it("generates a non-empty PDF", async () => {
    const response = await postJson("/v1/documents/generate", {
      content_markdown: "# API Report\n\nGenerated from API.",
      template: "minimal",
      format: "pdf"
    });
    const body = (await response.json()) as {
      document_id: string;
      status: string;
      format: string;
      file_path: string;
    };

    expect(response.status).toBe(200);
    expect(body.document_id).toMatch(/^doc_/);
    expect(body.status).toBe("completed");
    expect(body.format).toBe("pdf");

    const pdfPath = path.resolve(process.cwd(), body.file_path);
    const pdfStat = await stat(pdfPath);
    expect(pdfStat.size).toBeGreaterThan(0);

    const pdfHeader = await readFile(pdfPath, { encoding: "utf8" });
    expect(pdfHeader.startsWith("%PDF")).toBe(true);
  });

  it("returns health, readiness, and request correlation headers", async () => {
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthBody = (await healthResponse.json()) as { status: string };

    expect(healthResponse.status).toBe(200);
    expect(healthResponse.headers.get("x-request-id")).toBeTruthy();
    expect(healthBody.status).toBe("ok");

    const readyResponse = await fetch(`${baseUrl}/ready`);
    const readyBody = (await readyResponse.json()) as {
      status: string;
      checks: {
        templates: string;
        output: string;
        s3: string;
      };
    };

    expect(readyResponse.status).toBe(200);
    expect(readyBody).toEqual({
      status: "ready",
      checks: {
        templates: "ok",
        output: "ok",
        s3: "ok"
      }
    });
  });

  it("reports readiness failures", async () => {
    const failingServer = createApiServer({
      templatesRoot: path.join(outputRoot, "missing-templates"),
      outputRoot
    });

    const response = await failingServer.inject({ method: "GET", url: "/ready" });
    const body = response.json() as {
      status: string;
      checks: {
        templates: string;
        output: string;
        s3: string;
      };
    };

    expect(response.statusCode).toBe(503);
    expect(body.status).toBe("not_ready");
    expect(body.checks.templates).toBe("error");
    expect(body.checks.output).toBe("ok");
    expect(body.checks.s3).toBe("ok");
    await failingServer.close();
  });

  it("reports S3 readiness failures when storage config is incomplete", async () => {
    const failingServer = createApiServer({
      templatesRoot,
      outputRoot,
      storageDriver: "s3"
    });

    const response = await failingServer.inject({ method: "GET", url: "/ready" });
    const body = response.json() as {
      status: string;
      checks: {
        templates: string;
        output: string;
        s3: string;
      };
    };

    expect(response.statusCode).toBe(503);
    expect(body.status).toBe("not_ready");
    expect(body.checks.s3).toBe("error");
    await failingServer.close();
  });

  it("protects REST endpoints when an API key is configured", async () => {
    const protectedServer = createApiServer({
      templatesRoot,
      outputRoot,
      apiKey: "local-secret"
    });

    const unauthorizedResponse = await protectedServer.inject({
      method: "GET",
      url: "/v1/templates"
    });
    expect(unauthorizedResponse.statusCode).toBe(401);
    expect(unauthorizedResponse.json()).toMatchObject({
      error: {
        code: "UNAUTHORIZED"
      }
    });

    const authorizedResponse = await protectedServer.inject({
      method: "GET",
      url: "/v1/templates",
      headers: {
        authorization: "Bearer local-secret"
      }
    });
    expect(authorizedResponse.statusCode).toBe(200);
    expect(authorizedResponse.headers["x-request-id"]).toBeTruthy();
    await protectedServer.close();
  });

  it("generates a non-empty DOCX", async () => {
    const response = await postJson("/v1/documents/generate", {
      content_markdown: "# API DOCX Report\n\nGenerated from API.",
      template: "minimal",
      format: "docx"
    });
    const body = (await response.json()) as {
      document_id: string;
      status: string;
      format: string;
      file_path: string;
    };

    expect(response.status).toBe(200);
    expect(body.document_id).toMatch(/^doc_/);
    expect(body.status).toBe("completed");
    expect(body.format).toBe("docx");

    const docxPath = path.resolve(process.cwd(), body.file_path);
    const docxStat = await stat(docxPath);
    expect(docxStat.size).toBeGreaterThan(0);

    const docxHeader = await readFile(docxPath, { encoding: "utf8" });
    expect(docxHeader.startsWith("PK")).toBe(true);
  });

  it("stores generated documents in S3-compatible storage", async () => {
    const s3Storage = createFakeS3Storage(outputRoot);
    const s3Server = createApiServer({
      templatesRoot,
      outputRoot,
      storageDriver: "s3",
      storage: s3Storage
    });
    await s3Server.listen({ port: 0 });
    const address = s3Server.server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${address.port}/v1/documents/generate`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content_markdown: "# API S3 Report\n\nGenerated from API.",
        template: "minimal",
        format: "pdf"
      })
    });
    const body = (await response.json()) as {
      document_id: string;
      status: string;
      format: string;
      file_path: string;
      storage: string;
      bucket: string;
      key: string;
      download_url: string;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("completed");
    expect(body.storage).toBe("s3");
    expect(body.bucket).toBe("docform-test");
    expect(body.key).toBe(`${body.document_id}.pdf`);
    expect(body.file_path).toBe(`s3://docform-test/${body.key}`);
    expect(body.download_url).toBe(`https://storage.example.com/docform-test/${body.key}?signature=test`);
    await s3Server.close();
  });

  it("queues async document generation and exposes completed status", async () => {
    const jobs = new InMemoryGenerateJobStore();
    const asyncServer = createApiServer({
      templatesRoot,
      outputRoot,
      jobs,
      jobsWorkerEnabled: true
    });
    await asyncServer.listen({ port: 0 });
    const address = asyncServer.server.address() as AddressInfo;
    const asyncBaseUrl = `http://127.0.0.1:${address.port}`;

    const response = await fetch(`${asyncBaseUrl}/v1/documents/generate`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        mode: "async",
        content_markdown: "# Async Report\n\nGenerated from API.",
        template: "minimal",
        format: "pdf"
      })
    });
    const body = (await response.json()) as {
      document_id: string;
      status: string;
    };

    expect(response.status).toBe(202);
    expect(body.document_id).toMatch(/^doc_/);
    expect(body.status).toBe("queued");

    const completed = await waitForDocumentStatus(asyncBaseUrl, body.document_id, "completed");
    expect(completed).toMatchObject({
      document_id: body.document_id,
      status: "completed",
      format: "pdf",
      template: "minimal"
    });
    expect(completed.file_path).toMatch(/\.pdf$/);
    await asyncServer.close();
  });

  it("returns running job status", async () => {
    const runningJobs = createStaticJobStore({
      document_id: "doc_running",
      status: "running",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      format: "pdf",
      template: "minimal"
    });
    const statusServer = createApiServer({
      templatesRoot,
      outputRoot,
      jobs: runningJobs
    });

    const response = await statusServer.inject({ method: "GET", url: "/v1/documents/doc_running" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      document_id: "doc_running",
      status: "running",
      format: "pdf",
      template: "minimal"
    });
    await statusServer.close();
  });

  it("returns failed job status", async () => {
    const failingStorage = createFailingStorage(outputRoot);
    const jobs = new InMemoryGenerateJobStore();
    const asyncServer = createApiServer({
      templatesRoot,
      outputRoot,
      storage: failingStorage,
      jobs,
      jobsWorkerEnabled: true
    });
    await asyncServer.listen({ port: 0 });
    const address = asyncServer.server.address() as AddressInfo;
    const asyncBaseUrl = `http://127.0.0.1:${address.port}`;

    const response = await fetch(`${asyncBaseUrl}/v1/documents/generate`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        mode: "async",
        content_markdown: "# Async Failure\n\nGenerated from API.",
        template: "minimal",
        format: "pdf"
      })
    });
    const body = (await response.json()) as {
      document_id: string;
    };

    const failed = await waitForDocumentStatus(asyncBaseUrl, body.document_id, "failed");
    expect(failed).toMatchObject({
      document_id: body.document_id,
      status: "failed",
      error: {
        message: "storage failed"
      }
    });
    await asyncServer.close();
  });

  it("returns 404 for missing document jobs", async () => {
    const statusServer = createApiServer({
      templatesRoot,
      outputRoot,
      jobs: new InMemoryGenerateJobStore()
    });

    const response = await statusServer.inject({ method: "GET", url: "/v1/documents/doc_missing" });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: {
        code: "DOCUMENT_NOT_FOUND"
      }
    });
    await statusServer.close();
  });

  it("returns HTML preview", async () => {
    const response = await postJson("/v1/documents/preview", {
      content_markdown: "# Preview\n\nHello API.",
      template: "minimal"
    });
    const body = (await response.json()) as { status: string; format: string; html: string };

    expect(response.status).toBe(200);
    expect(body.status).toBe("completed");
    expect(body.format).toBe("html");
    expect(body.html).toContain("<h1>Preview</h1>");
    expect(body.html).toContain(".docform-document");
  });

  it("lists templates", async () => {
    const response = await fetch(`${baseUrl}/v1/templates`);
    const body = (await response.json()) as {
      templates: Array<{
        id: string;
        formats: string[];
        layout?: {
          header?: {
            content?: string;
          };
        };
        design?: {
          primaryColor?: string;
        };
      }>;
    };

    expect(response.status).toBe(200);
    expect(body.templates).toContainEqual(
      expect.objectContaining({
        id: "minimal",
        formats: expect.arrayContaining(["pdf", "html"]),
        layout: expect.objectContaining({
          header: expect.objectContaining({ content: "DocForm" })
        }),
        design: expect.objectContaining({ primaryColor: "#2563eb" })
      })
    );
  });

  it("returns template details", async () => {
    const response = await fetch(`${baseUrl}/v1/templates/minimal`);
    const body = (await response.json()) as {
      id: string;
      name: string;
      source: string;
      layout?: {
        footer?: {
          content?: string;
        };
      };
      design?: {
        documentMaxWidth?: string;
      };
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: "minimal",
      name: "Minimal",
      layout: expect.objectContaining({
        footer: expect.objectContaining({ content: "Generated with DocForm" })
      }),
      design: expect.objectContaining({ documentMaxWidth: "760px" }),
      source: "basic"
    });
  });

  it("returns validation errors as JSON", async () => {
    const response = await postJson("/v1/documents/generate", {
      template: "minimal",
      format: "pdf"
    });
    const body = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toContain("content_markdown");
  });

  it("returns validation errors for unknown formats", async () => {
    const response = await postJson("/v1/documents/generate", {
      content_markdown: "# API Report\n\nGenerated from API.",
      template: "minimal",
      format: "txt"
    });
    const body = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toContain("Unsupported output format");
  });

  it("returns malformed JSON errors as validation errors", async () => {
    const response = await fetch(`${baseUrl}/v1/documents/generate`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: "{"
    });
    const body = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  async function postJson(pathname: string, body: unknown): Promise<Response> {
    return fetch(`${baseUrl}${pathname}`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });
  }
});

function createFakeS3Storage(outputRoot: string): DocumentStorage {
  return {
    resolveOutputPath(input) {
      return path.join(outputRoot, "tmp", `${input.documentId}.${input.format}`);
    },
    async storeGeneratedDocument(input) {
      const output = await stat(input.localPath);
      expect(output.size).toBeGreaterThan(0);

      return {
        storage: "s3",
        file_path: `s3://docform-test/${input.documentId}.${input.format}`,
        bucket: "docform-test",
        key: `${input.documentId}.${input.format}`,
        download_url: `https://storage.example.com/docform-test/${input.documentId}.${input.format}?signature=test`
      };
    }
  };
}

function createFailingStorage(outputRoot: string): DocumentStorage {
  return {
    resolveOutputPath(input) {
      return path.join(outputRoot, "tmp", `${input.documentId}.${input.format}`);
    },
    async storeGeneratedDocument() {
      throw new Error("storage failed");
    }
  };
}

function createStaticJobStore(record: Awaited<ReturnType<GenerateJobStore["get"]>>): GenerateJobStore {
  return {
    async enqueue() {},
    async get() {
      return record;
    }
  };
}

async function waitForDocumentStatus(
  baseUrl: string,
  documentId: string,
  expectedStatus: string
): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const response = await fetch(`${baseUrl}/v1/documents/${documentId}`);
    const body = (await response.json()) as Record<string, unknown>;
    if (body.status === expectedStatus) {
      return body;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  throw new Error(`Document ${documentId} did not reach ${expectedStatus}.`);
}
