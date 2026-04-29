import Fastify, { type FastifyInstance } from "fastify";
import { ValidationError } from "@docform/core";
import { createApiConfig, type ApiServerOptions } from "./config.js";
import { writeError } from "./http/errors.js";
import { registerDocumentRoutes } from "./routes/documents.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerTemplateRoutes } from "./routes/templates.js";

export type { ApiServerOptions } from "./config.js";

export function createApiServer(options: ApiServerOptions = {}): FastifyInstance {
  const config = createApiConfig(options);
  const server = Fastify({ logger: false });

  server.setErrorHandler((error, _request, reply) => {
    writeError(reply, error);
  });

  server.setNotFoundHandler((request, reply) => {
    writeError(reply, new ValidationError(`Route ${request.method} ${request.url} was not found.`), 404);
  });

  registerHealthRoutes(server);
  registerDocumentRoutes(server, config);
  registerTemplateRoutes(server, config);

  return server;
}
