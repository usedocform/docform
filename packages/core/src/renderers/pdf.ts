import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import type { Template } from "../templates/registry.js";

export async function renderPdf(html: string, outputPath: string, template: Template): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.pdf({
      path: outputPath,
      format: template.manifest.defaultOptions?.pageSize ?? "A4",
      margin: template.manifest.defaultOptions?.margin
        ? {
            top: template.manifest.defaultOptions.margin,
            right: template.manifest.defaultOptions.margin,
            bottom: template.manifest.defaultOptions.margin,
            left: template.manifest.defaultOptions.margin
          }
        : undefined,
      printBackground: true
    });
  } finally {
    await browser.close();
  }
}
