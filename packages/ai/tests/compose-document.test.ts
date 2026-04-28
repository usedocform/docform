import { describe, expect, it } from "vitest";
import { AiOutputValidationError, MockAiProvider, composeDocument } from "../src/index.js";

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
});
