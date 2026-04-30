#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod/v4";
import { callTool, createToolContext, type CreateToolContextOptions, type McpToolContext } from "./tools.js";

export type StartMcpServerOptions = CreateToolContextOptions;

export async function startMcpServer(options: StartMcpServerOptions = {}): Promise<void> {
  const context = createToolContext(options);
  const server = createMcpServer(context);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function createMcpServer(context: McpToolContext): McpServer {
  const server = new McpServer({
    name: "docform-mcp-server",
    version: "0.3.0"
  });

  server.registerTool(
    "generate_document",
    {
      description: "Generate a PDF or DOCX document from Markdown through DocForm core.",
      inputSchema: {
        format: z.enum(["pdf", "docx"]).default("pdf"),
        template: z.string().default("minimal"),
        content_markdown: z.string(),
        output_path: z.string().optional()
      }
    },
    async (args) => executeTool("generate_document", args, context)
  );

  server.registerTool(
    "preview_document",
    {
      description: "Render an HTML preview from Markdown through DocForm core.",
      inputSchema: {
        template: z.string().default("minimal"),
        content_markdown: z.string()
      }
    },
    async (args) => executeTool("preview_document", args, context)
  );

  server.registerTool(
    "list_templates",
    {
      description: "List templates from the DocForm template registry."
    },
    async () => executeTool("list_templates", {}, context)
  );

  server.registerTool(
    "get_template",
    {
      description: "Get template metadata from the DocForm template registry.",
      inputSchema: {
        template: z.string().default("minimal")
      }
    },
    async (args) => executeTool("get_template", args, context)
  );

  return server;
}

async function executeTool(name: string, args: unknown, context: McpToolContext): Promise<CallToolResult> {
  try {
    const result = await callTool(name, args, context);
    return toTextResult(result);
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
        }
      ]
    };
  }
}

function toTextResult(result: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
  };
}

const isMain = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

if (isMain) {
  startMcpServer().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
