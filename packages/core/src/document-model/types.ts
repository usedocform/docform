export type DocumentModel = {
  metadata: {
    title?: string;
    language?: "ru" | "en";
  };
  blocks: DocumentBlock[];
};

export type DocumentBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; language?: string; code: string }
  | { type: "table"; columns: string[]; rows: string[][] };
