import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../src/input/markdown.js";

describe("parseMarkdown", () => {
  it("converts Markdown into the v0.1 document model", () => {
    const model = parseMarkdown(`# Title

Intro paragraph.

- First
- Second

> Quote

| Name | Status |
| --- | --- |
| Core | Ready |

\`\`\`ts
const ok = true;
\`\`\`
`);

    expect(model.metadata.title).toBe("Title");
    expect(model.blocks).toEqual([
      { type: "heading", level: 1, text: "Title" },
      { type: "paragraph", text: "Intro paragraph." },
      { type: "list", ordered: false, items: ["First", "Second"] },
      { type: "quote", text: "Quote" },
      { type: "table", columns: ["Name", "Status"], rows: [["Core", "Ready"]] },
      { type: "code", language: "ts", code: "const ok = true;" }
    ]);
  });
});
