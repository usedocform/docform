import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApiServer } from "../src/server.js";

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
    const body = (await response.json()) as { templates: Array<{ id: string; formats: string[] }> };

    expect(response.status).toBe(200);
    expect(body.templates).toContainEqual(
      expect.objectContaining({
        id: "minimal",
        formats: expect.arrayContaining(["pdf", "html"])
      })
    );
  });

  it("returns template details", async () => {
    const response = await fetch(`${baseUrl}/v1/templates/minimal`);
    const body = (await response.json()) as { id: string; name: string; source: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: "minimal",
      name: "Minimal",
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
