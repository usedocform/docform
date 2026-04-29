import { describe, expect, it } from "vitest";
import {
  AiOutputValidationError,
  MockAiProvider,
  composeDocument,
  splitTextIntoChunks,
  type AiGenerateInput,
  type AiGenerateResult,
  type AiProvider
} from "../src/index.js";

describe("composeDocument", () => {
  it("validates provider output into a document model", async () => {
    const provider = new MockAiProvider({
      content: {
        templateId: "minimal",
        styleProfile: {
          tone: "office",
          density: "normal",
          fontScale: "normal"
        },
        document: {
          metadata: {
            title: "Office Memo",
            language: "en"
          },
          blocks: [
            { type: "heading", level: 1, text: "Office Memo" },
            { type: "paragraph", text: "A structured office-style memo." }
          ]
        }
      }
    });

    const result = await composeDocument({
      text: "raw memo",
      instruction: "make it office style",
      style: "office",
      provider
    });

    expect(result.templateId).toBe("minimal");
    expect(result.styleProfile.tone).toBe("office");
    expect(result.document.metadata.title).toBe("Office Memo");
    expect(result.ai.provider).toBe("mock");
  });

  it("rejects unsafe AI output", async () => {
    const provider = new MockAiProvider({
      content: {
        templateId: "minimal",
        styleProfile: { tone: "office" },
        document: {
          metadata: {},
          blocks: [{ type: "paragraph", text: "<script>alert(1)</script>" }]
        }
      }
    });

    await expect(
      composeDocument({
        text: "raw",
        instruction: "format",
        provider
      })
    ).rejects.toThrow(AiOutputValidationError);
  });

  it("composes large documents by splitting input into chunks", async () => {
    const text = ["First section with details.", "Second section with risks.", "Third section with actions."].join(
      "\n\n"
    );
    const chunks = splitTextIntoChunks(text, { chunkSize: 34, chunkOverlap: 0 });
    const provider = new QueueAiProvider(chunks.map((chunk) => createContent(`Chunk ${chunk.index}`)));

    const result = await composeDocument({
      text,
      instruction: "make it office style",
      provider,
      largeDocument: {
        threshold: 20,
        chunkSize: 34,
        chunkOverlap: 0
      }
    });

    expect(provider.inputs).toHaveLength(chunks.length);
    expect(provider.inputs[0]?.userPrompt).toContain('"section"');
    expect(result.document.blocks).toHaveLength(chunks.length);
    expect(result.ai.usage).toEqual({
      inputTokens: chunks.length,
      outputTokens: chunks.length
    });
  });

  it("reduces merged large documents when final limits are exceeded", async () => {
    const text = Array.from({ length: 12 }, (_, index) => `Section ${index + 1}: ${"content ".repeat(6)}`).join(
      "\n\n"
    );
    const chunks = splitTextIntoChunks(text, { chunkSize: 42, chunkOverlap: 0 });
    const partials = chunks.map((chunk) =>
      createContent(`Chunk ${chunk.index}`, Array.from({ length: 20 }, (_, index) => `Chunk ${chunk.index}.${index}`))
    );
    const provider = new QueueAiProvider([...partials, createContent("Final summary")]);

    const result = await composeDocument({
      text,
      instruction: "summarize into a final office document",
      provider,
      largeDocument: {
        threshold: 20,
        chunkSize: 42,
        chunkOverlap: 0
      }
    });

    expect(chunks.length).toBeGreaterThan(4);
    expect(provider.inputs).toHaveLength(chunks.length + 1);
    expect(provider.inputs.at(-1)?.userPrompt).toContain('"limits"');
    expect(result.document.blocks).toEqual([{ type: "paragraph", text: "Final summary" }]);
  });
});

describe("splitTextIntoChunks", () => {
  it("keeps short text as one chunk", () => {
    expect(splitTextIntoChunks("Short text", { chunkSize: 100, chunkOverlap: 0 })).toEqual([
      { index: 1, total: 1, text: "Short text" }
    ]);
  });

  it("splits long text with stable indexes and totals", () => {
    const chunks = splitTextIntoChunks("Alpha paragraph.\n\nBeta paragraph.\n\nGamma paragraph.", {
      chunkSize: 24,
      chunkOverlap: 0
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((chunk) => chunk.index)).toEqual(chunks.map((_, index) => index + 1));
    expect(chunks.every((chunk) => chunk.total === chunks.length)).toBe(true);
  });
});

class QueueAiProvider implements AiProvider {
  readonly name = "queue";
  readonly model = "queue-model";
  readonly inputs: AiGenerateInput[] = [];

  constructor(private readonly contents: unknown[]) {}

  async generateStructured(input: AiGenerateInput): Promise<AiGenerateResult> {
    this.inputs.push(input);
    const content = this.contents.shift();
    if (!content) {
      throw new Error("QueueAiProvider has no content left.");
    }

    return {
      content,
      model: this.model,
      usage: {
        inputTokens: 1,
        outputTokens: 1
      }
    };
  }
}

function createContent(text: string, blockTexts: string[] = [text]): unknown {
  return {
    templateId: "minimal",
    styleProfile: {
      tone: "office",
      density: "normal",
      fontScale: "normal"
    },
    document: {
      metadata: {
        title: text,
        language: "en"
      },
      blocks: blockTexts.map((blockText) => ({ type: "paragraph", text: blockText }))
    }
  };
}
