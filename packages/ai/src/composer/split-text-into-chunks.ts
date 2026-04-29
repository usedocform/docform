export type TextChunk = {
  index: number;
  total: number;
  text: string;
};

export type SplitTextIntoChunksOptions = {
  chunkSize: number;
  chunkOverlap: number;
};

export function splitTextIntoChunks(text: string, options: SplitTextIntoChunksOptions): TextChunk[] {
  const normalizedText = text.replace(/\r\n/g, "\n").trim();
  if (!normalizedText) {
    return [{ index: 1, total: 1, text: "" }];
  }

  if (options.chunkSize <= 0) {
    throw new Error("chunkSize must be greater than 0.");
  }

  if (options.chunkOverlap < 0 || options.chunkOverlap >= options.chunkSize) {
    throw new Error("chunkOverlap must be greater than or equal to 0 and smaller than chunkSize.");
  }

  const chunks: string[] = [];
  let offset = 0;

  while (offset < normalizedText.length) {
    const end = Math.min(offset + options.chunkSize, normalizedText.length);
    const chunkEnd = end === normalizedText.length ? end : findChunkBoundary(normalizedText, offset, end);
    const chunk = normalizedText.slice(offset, chunkEnd).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (chunkEnd >= normalizedText.length) {
      break;
    }

    offset = Math.max(chunkEnd - options.chunkOverlap, offset + 1);
  }

  return chunks.map((chunk, index) => ({
    index: index + 1,
    total: chunks.length,
    text: chunk
  }));
}

function findChunkBoundary(text: string, start: number, preferredEnd: number): number {
  const windowStart = Math.max(start, preferredEnd - 1200);
  const boundaryPatterns = ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " "];

  for (const pattern of boundaryPatterns) {
    const boundary = text.lastIndexOf(pattern, preferredEnd);
    if (boundary >= windowStart) {
      return boundary + pattern.length;
    }
  }

  return preferredEnd;
}
