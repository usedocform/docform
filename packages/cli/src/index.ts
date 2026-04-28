#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { composeDocument, createAiProvider, type AiProviderName } from "@docform/ai";
import { generateDocument, generateDocumentFromModel } from "@docform/core";

type GenerateArgs = {
  input?: string;
  output?: string;
  template: string;
  format: string;
  templatesRoot?: string;
  ai: boolean;
  aiInstruction?: string;
  aiProvider?: AiProviderName;
  aiModel?: string;
  aiBaseUrl?: string;
  aiApiKey?: string;
  aiStyle?: string;
};

async function main(argv: string[]): Promise<void> {
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  const [command, ...rest] = normalizedArgv;

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command !== "generate") {
    throw new Error(`Unknown command "${command}".`);
  }

  const args = parseGenerateArgs(rest);
  if (!args.input || !args.output) {
    throw new Error("Both --input and --output are required.");
  }

  const cwd = process.env.INIT_CWD ?? process.cwd();
  const inputPath = path.resolve(cwd, args.input);
  const outputPath = path.resolve(cwd, args.output);
  const templatesRoot = path.resolve(cwd, args.templatesRoot ?? "packages/templates-basic/templates");

  if (args.ai || args.aiInstruction) {
    if (!args.aiInstruction) {
      throw new Error("--ai-instruction is required when AI generation is enabled.");
    }

    const provider = createAiProvider({
      provider: args.aiProvider,
      model: args.aiModel,
      baseUrl: args.aiBaseUrl,
      apiKey: args.aiApiKey
    });
    const text = await readFile(inputPath, "utf8");
    const composed = await composeDocument({
      text,
      instruction: args.aiInstruction,
      template: args.template,
      style: args.aiStyle,
      provider
    });

    await generateDocumentFromModel({
      model: composed.document,
      outputPath,
      templateId: args.template === "auto" ? composed.templateId : args.template,
      format: args.format,
      templatesRoot
    });
  } else {
    await generateDocument({
      inputPath,
      outputPath,
      templateId: args.template,
      format: args.format,
      templatesRoot
    });
  }

  console.log(`Created ${args.output}`);
}

function parseGenerateArgs(argv: string[]): GenerateArgs {
  const args: GenerateArgs = {
    template: "minimal",
    format: "pdf",
    ai: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];

    if (!flag?.startsWith("--")) {
      throw new Error(`Unexpected argument "${flag}".`);
    }

    switch (flag) {
      case "--ai":
        args.ai = true;
        break;
      case "--input":
        args.input = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--output":
        args.output = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--template":
        args.template = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--format":
        args.format = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--templates-root":
        args.templatesRoot = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--ai-instruction":
        args.aiInstruction = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--ai-provider":
        args.aiProvider = parseAiProvider(readFlagValue(argv, index, flag));
        index += 1;
        break;
      case "--ai-model":
        args.aiModel = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--ai-base-url":
        args.aiBaseUrl = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--ai-api-key":
        args.aiApiKey = readFlagValue(argv, index, flag);
        index += 1;
        break;
      case "--ai-style":
        args.aiStyle = readFlagValue(argv, index, flag);
        index += 1;
        break;
      default:
        throw new Error(`Unknown option "${flag}".`);
    }
  }

  return args;
}

function readFlagValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}.`);
  }

  return value;
}

function parseAiProvider(value: string): AiProviderName {
  if (value === "openai-compatible" || value === "ollama" || value === "mock") {
    return value;
  }

  throw new Error(`Unsupported AI provider "${value}".`);
}

function printHelp(): void {
  console.log(`DocForm 0.1

Usage:
  docform generate --input examples/markdown/report.md --template minimal --format pdf --output output/report.pdf
  docform generate --input raw.txt --ai-instruction "make it office style" --ai-provider openai-compatible --ai-model gpt-4.1-mini --output output/report.pdf

Options:
  --input            Path to a Markdown file.
  --output           Path where the generated PDF will be saved.
  --template         Template id. Defaults to "minimal".
  --format           Output format. DocForm 0.1 supports only "pdf".
  --templates-root   Templates directory. Defaults to packages/templates-basic/templates.
  --ai               Enable AI composition for the input text.
  --ai-instruction   Instruction for AI composition, for example "make it office style".
  --ai-provider      AI provider: openai-compatible, ollama, or mock.
  --ai-model         AI model name.
  --ai-base-url      AI provider base URL.
  --ai-api-key       AI API key. Prefer DOCFORM_AI_API_KEY for real keys.
  --ai-style         Optional style hint: office, formal, minimal, or sales.

Environment:
  DOCFORM_AI_PROVIDER, DOCFORM_AI_MODEL, DOCFORM_AI_BASE_URL, DOCFORM_AI_API_KEY
`);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`DocForm error: ${message}`);
  process.exitCode = 1;
});
