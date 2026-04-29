import type { FastifyInstance, FastifyReply } from "fastify";
import { TemplateRegistry } from "@docform/core";
import type { ApiConfig } from "../config.js";

export function registerTemplateRoutes(server: FastifyInstance, config: ApiConfig): void {
  server.get("/v1/templates", async (_request, reply) => handleListTemplates(reply, config));

  server.get<{ Params: { id: string } }>("/v1/templates/:id", async (request, reply) =>
    handleGetTemplate(reply, config, request.params.id)
  );
}

async function handleListTemplates(reply: FastifyReply, config: ApiConfig): Promise<void> {
  const registry = new TemplateRegistry(config.templatesRoot);
  const templates = await registry.list();

  reply.send({
    templates: templates.map((template) => ({
      id: template.id,
      name: template.name,
      version: template.version,
      formats: template.formats,
      source: "basic"
    }))
  });
}

async function handleGetTemplate(reply: FastifyReply, config: ApiConfig, templateId: string): Promise<void> {
  const registry = new TemplateRegistry(config.templatesRoot);
  const template = await registry.get(templateId);

  reply.send({
    id: template.manifest.id,
    name: template.manifest.name,
    version: template.manifest.version,
    formats: template.manifest.formats,
    default_options: template.manifest.defaultOptions,
    source: "basic"
  });
}
