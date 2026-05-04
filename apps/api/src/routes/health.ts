import { access, mkdir } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import type { ApiConfig } from "../config.js";
import { getS3Readiness } from "../storage.js";

export function registerHealthRoutes(server: FastifyInstance, config: ApiConfig): void {
  server.get("/health", async () => ({ status: "ok" }));

  server.get("/ready", async (_request, reply) => {
    const checks = await checkReadiness(config);
    const isReady = Object.values(checks).every((status) => status === "ok");

    reply.status(isReady ? 200 : 503).send({
      status: isReady ? "ready" : "not_ready",
      checks
    });
  });
}

async function checkReadiness(config: ApiConfig): Promise<{
  templates: "ok" | "error";
  output: "ok" | "error";
  s3: "ok" | "error";
}> {
  const checks = {
    templates: "ok" as "ok" | "error",
    output: "ok" as "ok" | "error",
    s3: getS3Readiness(config.storage)
  };

  try {
    await access(config.templatesRoot);
  } catch {
    checks.templates = "error";
  }

  try {
    await mkdir(config.outputRoot, { recursive: true });
  } catch {
    checks.output = "error";
  }

  return checks;
}
