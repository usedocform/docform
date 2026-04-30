import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from "docx";
import type { DocumentBlock, DocumentModel } from "../document-model/types.js";
import type { Template } from "../templates/registry.js";

export async function renderDocx(model: DocumentModel, outputPath: string, _template: Template): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });

  const document = new Document({
    sections: [
      {
        properties: {},
        children: model.blocks.flatMap(renderBlock)
      }
    ]
  });

  const buffer = await Packer.toBuffer(document);
  await writeFile(outputPath, buffer);
}

function renderBlock(block: DocumentBlock): Array<Paragraph | Table> {
  switch (block.type) {
    case "heading":
      return [
        new Paragraph({
          text: block.text,
          heading: toHeadingLevel(block.level)
        })
      ];
    case "paragraph":
      return [new Paragraph({ children: [new TextRun(block.text)] })];
    case "list":
      return block.items.map(
        (item, index) =>
          new Paragraph({
            text: block.ordered ? `${index + 1}. ${item}` : item,
            bullet: block.ordered ? undefined : { level: 0 }
          })
      );
    case "quote":
      return [
        new Paragraph({
          children: [new TextRun({ text: block.text, italics: true })]
        })
      ];
    case "code":
      return [
        new Paragraph({
          children: [new TextRun({ text: block.code, font: "Courier New" })]
        })
      ];
    case "table":
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: block.columns.map((column) =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: column, bold: true })] })]
                })
              )
            }),
            ...block.rows.map(
              (row) =>
                new TableRow({
                  children: row.map(
                    (cell) =>
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun(cell)] })]
                      })
                  )
                })
            )
          ]
        })
      ];
  }
}

function toHeadingLevel(level: 1 | 2 | 3): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  if (level === 1) {
    return HeadingLevel.HEADING_1;
  }

  if (level === 2) {
    return HeadingLevel.HEADING_2;
  }

  return HeadingLevel.HEADING_3;
}
