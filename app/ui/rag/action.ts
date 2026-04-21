"use server";

import {
	assignCollectionId,
	applyIconsToNodes,
	collectFileIds,
	parseDirectories,
} from "@/app/lib/collection/treeHydrate";
import { createRagTransactionPg, deleteRagTransactionPg, listRagTransactionsPg } from "@/app/lib/rag/pgvector.server";
import { ingestMarkdownDocsToPg, type ChunkType } from "@/app/lib/rag/ingestMarkdown.server";
import type { TreeViewGroup } from "@/app/lib/components/@types/treeViewTypes";
import type { RagTransactionRow } from "./types";

export async function getAllRagTransactions() {
	try {
		const rows = await listRagTransactionsPg();
		return { success: true, data: rows };
	} catch (error) {
		console.error("Failed to fetch RAG transactions:", error);
		return { success: false, error: "Failed to fetch RAG transactions" };
	}
}

const DEFAULT_RAG_UPDATED_BY = "SYSTEM";

export async function getRagPickerTreeData(): Promise<{
	success: boolean;
	data?: { groups: TreeViewGroup[]; subFileContentIds: string[] };
	error?: string;
}> {
	try {
		// Lazy import to avoid loading SQLite/better-sqlite3 at module eval time.
		const docActions = await import("@/app/ui/doc/action");
		const [collections, subFileContentIds] = await Promise.all([
			docActions.findAllCollections(),
			docActions.getAllSubFileContentIds(),
		]);
		const hydrated = collections.map((collection) => ({
			id: collection.id,
			name: collection.name ?? "",
			directories: assignCollectionId(parseDirectories(collection.directories), collection.id),
		}));
		const fileIds = new Set<string>();
		hydrated.forEach((c) => collectFileIds(c.directories, fileIds));
		const iconsById = fileIds.size > 0 ? await docActions.findFileIconsByIds([...fileIds]) : {};
		const groups: TreeViewGroup[] = hydrated.map((c) => ({
			id: c.id,
			name: c.name,
			directories: applyIconsToNodes(c.directories, iconsById),
		}));
		return { success: true, data: { groups, subFileContentIds } };
	} catch (error) {
		console.error("Failed to load collection tree:", error);
		return { success: false, error: "Failed to load collections" };
	}
}

export async function createRagTransaction(data: { ragName: string; collection: string }) {
	try {
		const collection = data.collection.trim();
		if (!collection) {
			return { success: false, error: "Select at least one Markdown file from a collection" };
		}
		const result = await createRagTransactionPg({
			ragName: data.ragName.trim(),
			collection,
			updatedBy: DEFAULT_RAG_UPDATED_BY,
		});
		return { success: true, data: result };
	} catch (error) {
		console.error("Failed to create RAG transaction:", error);
		return { success: false, error: "Failed to create RAG transaction" };
	}
}

export async function createRagTransactionAndIngest(data: {
  ragName: string;
  collection: string;
  chunkType: ChunkType;
  fileIds: string[];
}) {
  try {
    const ragName = data.ragName.trim();
    const collection = data.collection.trim();
    if (!ragName) return { success: false, error: "RAG name is required" };
    if (!collection) return { success: false, error: "Select at least one Markdown file" };
    const fileIds = Array.isArray(data.fileIds) ? data.fileIds.map((s) => s.trim()).filter(Boolean) : [];
    if (fileIds.length === 0) return { success: false, error: "Select at least one Markdown file" };

    const tx = await createRagTransactionPg({
      ragName,
      collection,
      updatedBy: DEFAULT_RAG_UPDATED_BY,
    });

    // Load markdown contents from local file DB (Docs).
    const fileSvc = await import("@/app/lib/services/fileService");
    const docs: { source: string | null; markdown: string }[] = [];
    for (const id of fileIds) {
      const f = await fileSvc.loadFile(id);
      if (!f) continue;
      const name = (f.name ?? "").toLowerCase();
      if (!name.endsWith(".md") && !name.endsWith(".markdown")) continue;
      const content = typeof (f as { content?: unknown }).content === "string" ? (f as { content: string }).content : "";
      if (!content.trim()) continue;
      docs.push({ source: f.name ?? id, markdown: content });
    }

    if (docs.length === 0) {
      return { success: false, error: "Selected files contained no Markdown content to ingest." };
    }

    const ingest = await ingestMarkdownDocsToPg({
      ragId: tx.id,
      chunkType: data.chunkType,
      docs,
    });

    return { success: true, data: { transaction: tx, ingest } };
  } catch (error) {
    console.error("Failed to create + ingest RAG:", error);
    const message = error instanceof Error ? error.message : "Failed to create + ingest RAG";
    return { success: false, error: message };
  }
}

export async function deleteRagTransaction(id: string) {
	try {
		const deleted = await deleteRagTransactionPg(id);
		return { success: deleted, data: deleted };
	} catch (error) {
		console.error("Failed to delete RAG transaction:", error);
		return { success: false, error: "Failed to delete RAG transaction" };
	}
}
