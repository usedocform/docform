import { describe, expect, it } from "vitest";
import type { DocumentModel } from "../src/document-model/types.js";
import { renderHtml } from "../src/renderers/html.js";
import type { Template } from "../src/templates/registry.js";

const model: DocumentModel = {
  metadata: {
    title: "Quarterly Report",
    language: "en"
  },
  blocks: [{ type: "paragraph", text: "Revenue grew." }]
};

describe("renderHtml", () => {
  it("renders layout slots and design tokens from the template manifest", () => {
    const html = renderHtml(model, createTemplate());

    expect(html).toContain('<header class="docform-header docform-align-right company-header">ACME</header>');
    expect(html).toContain('<footer class="docform-footer docform-align-center">Page footer</footer>');
    expect(html).toContain("--docform-primary-color: #123456;");
    expect(html).toContain("--docform-document-max-width: 720px;");
  });

  it("escapes layout slot content and skips unsafe CSS values", () => {
    const html = renderHtml(
      model,
      createTemplate({
        layout: {
          header: {
            content: '<script>alert("x")</script>',
            align: "left",
            className: 'bad" onclick="alert(1)'
          }
        },
        design: {
          primaryColor: "red;</style><script>alert(1)</script>",
          textColor: "#111827"
        }
      })
    );

    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).not.toContain('onclick="alert(1)');
    expect(html).not.toContain("red;</style>");
    expect(html).toContain("--docform-text-color: #111827;");
  });
});

function createTemplate(overrides: Partial<Template["manifest"]> = {}): Template {
  return {
    manifest: {
      id: "company",
      name: "Company",
      version: "0.1.0",
      formats: ["html", "pdf"],
      layout: {
        header: {
          content: "ACME",
          align: "right",
          className: "company-header"
        },
        footer: {
          content: "Page footer",
          align: "center"
        }
      },
      design: {
        primaryColor: "#123456",
        documentMaxWidth: "720px"
      },
      ...overrides
    },
    styles: ".docform-document { margin: 0; }",
    directory: "/templates/company"
  };
}
