import type { DocumentBlock, DocumentModel } from "../document-model/types.js";

const headingPattern = /^(#{1,3})\s+(.+)$/;
const unorderedListPattern = /^[-*]\s+(.+)$/;
const orderedListPattern = /^\d+\.\s+(.+)$/;

export function parseMarkdown(markdown: string): DocumentModel {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: DocumentBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim() || undefined;
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !(lines[index] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }

      blocks.push({ type: "code", language, code: codeLines.join("\n") });
      index += index < lines.length ? 1 : 0;
      continue;
    }

    const headingMatch = headingPattern.exec(trimmed);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2].trim()
      });
      index += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (index < lines.length && (lines[index] ?? "").trim().startsWith(">")) {
        quoteLines.push((lines[index] ?? "").trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", text: quoteLines.join("\n").trim() });
      continue;
    }

    if (isTableStart(lines, index)) {
      const columns = splitTableRow(lines[index] ?? "");
      index += 2;
      const rows: string[][] = [];

      while (index < lines.length && isTableRow(lines[index] ?? "")) {
        rows.push(splitTableRow(lines[index] ?? ""));
        index += 1;
      }

      blocks.push({ type: "table", columns, rows });
      continue;
    }

    const unorderedMatch = unorderedListPattern.exec(trimmed);
    const orderedMatch = orderedListPattern.exec(trimmed);
    if (unorderedMatch || orderedMatch) {
      const ordered = Boolean(orderedMatch);
      const items: string[] = [];

      while (index < lines.length) {
        const current = (lines[index] ?? "").trim();
        const match = ordered ? orderedListPattern.exec(current) : unorderedListPattern.exec(current);
        if (!match) {
          break;
        }
        items.push(match[1].trim());
        index += 1;
      }

      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length && shouldContinueParagraph(lines, index)) {
      paragraphLines.push((lines[index] ?? "").trim());
      index += 1;
    }

    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  const firstHeading = blocks.find(
    (block): block is Extract<DocumentBlock, { type: "heading" }> => block.type === "heading" && block.level === 1
  );

  return {
    metadata: firstHeading ? { title: firstHeading.text } : {},
    blocks
  };
}

function shouldContinueParagraph(lines: string[], index: number): boolean {
  const current = (lines[index] ?? "").trim();
  if (!current) {
    return false;
  }

  if (
    headingPattern.test(current) ||
    current.startsWith("```") ||
    current.startsWith(">") ||
    unorderedListPattern.test(current) ||
    orderedListPattern.test(current) ||
    isTableStart(lines, index)
  ) {
    return false;
  }

  return true;
}

function isTableStart(lines: string[], index: number): boolean {
  const current = lines[index] ?? "";
  const next = lines[index + 1] ?? "";
  return isTableRow(current) && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(next);
}

function isTableRow(line: string): boolean {
  return line.includes("|") && line.trim().length > 0;
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}
