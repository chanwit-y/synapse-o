import "server-only";

import { aiEmbedTexts } from "@/app/lib/services/ai";
import { insertRagDocumentChunks } from "@/app/lib/rag/pgvector.server";

export type ChunkType = "paragraph" | "fixed" | "heading";
export type IngestDocInput = { source: string | null; markdown: string };

const MAX_CHUNKS_PER_DOC = 200;
const CHUNK_TARGET_CHARS = 1200;
const CHUNK_OVERLAP_CHARS = 150;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeNewlines(s: string) {
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function chunkFixed(text: string, targetChars: number, overlapChars: number): string[] {
  const out: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) return out;
  const step = Math.max(1, targetChars - overlapChars);
  for (let i = 0; i < trimmed.length; i += step) {
    out.push(trimmed.slice(i, i + targetChars));
    if (out.length >= MAX_CHUNKS_PER_DOC) break;
  }
  return out;
}

function chunkParagraphPacked(markdownOrText: string): string[] {
  const text = normalizeNewlines(markdownOrText).trim();
  if (!text) return [];

  const paragraphs = text
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buf = "";

  const flush = () => {
    const out = buf.trim();
    if (out) chunks.push(out);
    buf = "";
  };

  for (const p of paragraphs) {
    if (!buf) {
      buf = p;
      continue;
    }
    if (buf.length + 2 + p.length <= CHUNK_TARGET_CHARS) {
      buf += `\n\n${p}`;
      continue;
    }
    flush();
    const overlap = chunks.length > 0 ? chunks[chunks.length - 1].slice(-CHUNK_OVERLAP_CHARS) : "";
    buf = overlap ? `${overlap}\n\n${p}` : p;
  }
  flush();

  const capped: string[] = [];
  for (const c of chunks) {
    if (c.length <= CHUNK_TARGET_CHARS * 2) {
      capped.push(c);
      continue;
    }
    for (let i = 0; i < c.length; i += CHUNK_TARGET_CHARS) {
      capped.push(c.slice(i, i + CHUNK_TARGET_CHARS));
    }
  }

  return capped.slice(0, MAX_CHUNKS_PER_DOC);
}

function chunkByHeading(markdown: string): string[] {
  const text = normalizeNewlines(markdown).trim();
  if (!text) return [];

  const lines = text.split("\n");
  const sections: string[] = [];
  let buf: string[] = [];

  const flush = () => {
    const s = buf.join("\n").trim();
    if (s) sections.push(s);
    buf = [];
  };

  for (const line of lines) {
    const isHeading = /^#{1,6}\s+\S/.test(line);
    if (isHeading && buf.length > 0) flush();
    buf.push(line);
  }
  flush();

  return chunkParagraphPacked(sections.join("\n\n"));
}

function chunkMarkdown(markdown: string, chunkType: ChunkType): string[] {
  const text = normalizeNewlines(markdown).trim();
  if (!text) return [];
  if (chunkType === "fixed") return chunkFixed(text, CHUNK_TARGET_CHARS, CHUNK_OVERLAP_CHARS);
  if (chunkType === "heading") return chunkByHeading(markdown);
  return chunkParagraphPacked(markdown);
}

export async function ingestMarkdownDocsToPg(input: {
  ragId: string;
  chunkType: ChunkType;
  docs: IngestDocInput[];
}): Promise<{
  ragId: string;
  chunkType: ChunkType;
  insertedChunks: number;
  docs: Array<{ docId: string; source: string | null; chunks: { count: number; avgChars: number } }>;
}> {
  const ragId = input.ragId.trim();
  if (!ragId) throw new Error("ragId is required.");

  const docs = (input.docs ?? []).filter((d) => (d?.markdown ?? "").trim());
  if (docs.length === 0) throw new Error("No docs to ingest.");

  const chunkType = input.chunkType;

  const chunkRows: Parameters<typeof insertRagDocumentChunks>[0] = [];
  const responseDocs: Array<{ docId: string; source: string | null; chunks: { count: number; avgChars: number } }> = [];

  const BATCH = 64;
  for (const d of docs) {
    const chunks = chunkMarkdown(d.markdown, chunkType);
    if (chunks.length === 0) continue;

    const docId = crypto.randomUUID();
    const documentId = crypto.randomUUID();

    const embeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      const vecs = await aiEmbedTexts(batch, "text-embedding-3-small");
      embeddings.push(...vecs);
    }

    chunks.forEach((content, idx) => {
      chunkRows.push({
        id: crypto.randomUUID(),
        ragId,
        documentId,
        source: d.source,
        chunkType,
        chunkIndex: idx,
        content,
        embedding: embeddings[idx],
        metadata: {
          rag_id: ragId,
          document_id: documentId,
          source: d.source,
          chunk_type: chunkType,
          chunk_index: idx,
          chunk_count: chunks.length,
          char_len: content.length,
        },
      });
    });

    responseDocs.push({
      docId: documentId,
      source: d.source,
      chunks: {
        count: chunks.length,
        avgChars: Math.round(chunks.reduce((a, c) => a + c.length, 0) / clamp(chunks.length, 1, Number.MAX_SAFE_INTEGER)),
      },
    });
  }

  if (chunkRows.length === 0) throw new Error("No content to ingest.");

  const chunkResult = await insertRagDocumentChunks(chunkRows);

  return {
    ragId,
    chunkType,
    insertedChunks: chunkResult.inserted,
    docs: responseDocs,
  };
}

