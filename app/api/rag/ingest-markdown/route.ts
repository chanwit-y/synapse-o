import { NextResponse } from "next/server";
import { createRagTransactionPg } from "@/app/lib/rag/pgvector.server";
import { ingestMarkdownDocsToPg, type ChunkType } from "@/app/lib/rag/ingestMarkdown.server";

const MAX_MD_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_DOCS_PER_REQUEST = 20;
const MAX_TOTAL_MD_BYTES = 10 * 1024 * 1024; // 10MB (all docs combined)
type IngestDocInput = { markdown: string; source: string | null };

function parseChunkType(value: unknown): ChunkType {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (v === "fixed" || v === "heading" || v === "paragraph") return v;
  return "paragraph";
}

function getByteLen(s: string): number {
  return new TextEncoder().encode(s).byteLength;
}

function assertMarkdownFilename(name: string | undefined | null): void {
  const n = (name ?? "").toLowerCase();
  if (!n.endsWith(".md") && !n.endsWith(".markdown")) {
    throw new Error("File must be a .md or .markdown.");
  }
}

async function readMarkdownFromRequest(request: Request): Promise<{
  docs: IngestDocInput[];
  chunkType: ChunkType;
  ragId: string | null;
  ragName: string | null;
  collection: string | null;
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const chunkType = parseChunkType(formData.get("chunkType"));
    const ragId = (formData.get("ragId") as string | null) ?? null;
    const ragName = (formData.get("ragName") as string | null) ?? null;
    const collection = (formData.get("collection") as string | null) ?? null;
    const sourceOverride = (formData.get("source") as string | null) ?? null;

    // Support:
    // - file: single file
    // - file: repeated
    // - files: multiple
    const files = [
      ...(formData.getAll("files") as File[]),
      ...(formData.getAll("file") as File[]),
    ].filter(Boolean);

    if (files.length === 0) throw new Error("No file provided (expected form-data field: file or files).");
    if (files.length > MAX_DOCS_PER_REQUEST) {
      throw new Error(`Too many files (max ${MAX_DOCS_PER_REQUEST}).`);
    }

    const docs: IngestDocInput[] = [];
    let totalBytes = 0;
    for (const f of files) {
      if (f.size > MAX_MD_BYTES) throw new Error(`Markdown file too large (max ${MAX_MD_BYTES} bytes).`);
      assertMarkdownFilename(f.name);
      const text = await f.text();
      totalBytes += getByteLen(text);
      if (totalBytes > MAX_TOTAL_MD_BYTES) {
        throw new Error(`Total markdown too large (max ${MAX_TOTAL_MD_BYTES} bytes).`);
      }
      docs.push({
        markdown: text,
        source: sourceOverride ?? (f.name ?? null),
      });
    }

    return { docs, chunkType, ragId, ragName, collection };
  }

  // JSON:
  // - single: { markdown, source?, chunkType? }
  // - multi:  { items: [{ markdown, source? }], chunkType? }
  const body = (await request.json()) as
    | { markdown?: string; source?: string; chunkType?: ChunkType; ragId?: string; ragName?: string; collection?: string }
    | { items?: Array<{ markdown?: string; source?: string }>; chunkType?: ChunkType; ragId?: string; ragName?: string; collection?: string };

  const chunkType = parseChunkType((body as { chunkType?: ChunkType })?.chunkType);
  const ragId = (body as { ragId?: string })?.ragId ?? null;
  const ragName = (body as { ragName?: string })?.ragName ?? null;
  const collection = (body as { collection?: string })?.collection ?? null;

  const items = (body as { items?: Array<{ markdown?: string; source?: string }> })?.items;
  if (Array.isArray(items)) {
    if (items.length === 0) throw new Error("items must not be empty.");
    if (items.length > MAX_DOCS_PER_REQUEST) throw new Error(`Too many items (max ${MAX_DOCS_PER_REQUEST}).`);
    let totalBytes = 0;
    const docs: IngestDocInput[] = items.map((it) => ({
      markdown: typeof it.markdown === "string" ? it.markdown : "",
      source: typeof it.source === "string" ? it.source : null,
    }));
    for (const d of docs) {
      if (!d.markdown.trim()) throw new Error("Each item must include non-empty markdown.");
      const bytes = getByteLen(d.markdown);
      if (bytes > MAX_MD_BYTES) throw new Error(`Markdown too large (max ${MAX_MD_BYTES} bytes).`);
      totalBytes += bytes;
      if (totalBytes > MAX_TOTAL_MD_BYTES) throw new Error(`Total markdown too large (max ${MAX_TOTAL_MD_BYTES} bytes).`);
    }
    return { docs, chunkType, ragId, ragName, collection };
  }

  const markdown = (body as { markdown?: string })?.markdown ?? "";
  if (typeof markdown !== "string" || !markdown.trim()) throw new Error("markdown is required (JSON body).");
  if (getByteLen(markdown) > MAX_MD_BYTES) throw new Error(`Markdown too large (max ${MAX_MD_BYTES} bytes).`);
  return {
    docs: [{ markdown, source: (body as { source?: string })?.source ?? null }],
    chunkType,
    ragId,
    ragName,
    collection,
  };
}

export async function POST(request: Request) {
  try {
    const { docs, chunkType, ragId: ragIdInput, ragName, collection } = await readMarkdownFromRequest(request);

    const ragId =
      ragIdInput?.trim()
        ? ragIdInput.trim()
        : ragName?.trim()
          ? (await createRagTransactionPg({
            ragName: ragName.trim(),
            collection: (collection ?? docs.map((d) => d.source ?? "(md)").join("; ")).trim(),
          })).id
          : null;

    if (!ragId) {
      return NextResponse.json(
        { success: false, error: "ragId is required (or provide ragName to create a new transaction)." },
        { status: 400 },
      );
    }

    const result = await ingestMarkdownDocsToPg({
      ragId,
      chunkType,
      docs: docs.map((d) => ({ source: d.source, markdown: d.markdown })),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Error ingesting markdown:", error);
    const message = error instanceof Error ? error.message : "Failed to ingest markdown";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

