import { randomUUID, timingSafeEqual } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import { ValidationError } from "@docform/core";
import { createApiConfig, type ApiConfig, type ApiServerOptions } from "./config.js";
import { writeError } from "./http/errors.js";
import { createGenerateJobStore, createGenerateJobWorker } from "./jobs.js";
import { registerDocumentRoutes } from "./routes/documents.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerTemplateRoutes } from "./routes/templates.js";

export type { ApiServerOptions } from "./config.js";

export function createApiServer(options: ApiServerOptions = {}): FastifyInstance {
  const config = createApiConfig(options);
  const jobs = createGenerateJobStore(config);
  const worker = jobs && config.jobs.workerEnabled ? createGenerateJobWorker(jobs, config) : undefined;
  const server = Fastify({
    logger: config.logRequests,
    requestIdHeader: "x-request-id",
    genReqId: () => randomUUID()
  });

  worker?.start();

  server.addHook("onClose", async () => {
    await worker?.stop();
    await jobs?.close?.();
  });

  server.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);

    if (config.apiKey && !isHealthRoute(request.url) && !hasValidApiKey(request.headers, config)) {
      return reply.status(401).send({
        error: {
          code: "UNAUTHORIZED",
          message: "A valid DocForm API key is required."
        }
      });
    }
  });

  if (config.logRequests) {
    server.addHook("onResponse", async (request, reply) => {
      request.log.info(
        {
          request_id: request.id,
          method: request.method,
          url: request.url,
          status_code: reply.statusCode
        },
        "request completed"
      );
    });
  }

  server.setErrorHandler((error, _request, reply) => {
    writeError(reply, error);
  });

  server.setNotFoundHandler((request, reply) => {
    writeError(reply, new ValidationError(`Route ${request.method} ${request.url} was not found.`), 404);
  });

  registerHealthRoutes(server, config);
  registerDocumentRoutes(server, config, jobs);
  registerTemplateRoutes(server, config);

  return server;
}

function isHealthRoute(url: string): boolean {
  return url === "/health" || url === "/ready";
}

function hasValidApiKey(headers: Record<string, string | string[] | undefined>, config: ApiConfig): boolean {
  const configuredApiKey = config.apiKey;
  if (!configuredApiKey) {
    return true;
  }

  const headerApiKey = getHeaderValue(headers["x-docform-api-key"]) ?? getBearerToken(getHeaderValue(headers.authorization));
  return Boolean(headerApiKey && safeEqual(headerApiKey, configuredApiKey));
}

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getBearerToken(value: string | undefined): string | undefined {
  if (!value?.startsWith("Bearer ")) {
    return undefined;
  }

  return value.slice("Bearer ".length).trim();
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}
