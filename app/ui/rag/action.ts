"use server";

import {
	assignCollectionId,
	applyIconsToNodes,
	collectFileIds,
	parseDirectories,
} from "@/app/lib/collection/treeHydrate";
import { RagTransactionRepository, type RagTransactionCreateInput } from "@/app/lib/db/repository/rag-transaction";
import { findAllCollections, findFileIconsByIds, getAllSubFileContentIds } from "@/app/ui/doc/action";
import type { TreeViewGroup } from "@/app/lib/components/@types/treeViewTypes";

const ragRepo = new RagTransactionRepository();

export async function getAllRagTransactions() {
	try {
		const rows = await ragRepo.findAll();
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
		const [collections, subFileContentIds] = await Promise.all([findAllCollections(), getAllSubFileContentIds()]);
		const hydrated = collections.map((collection) => ({
			id: collection.id,
			name: collection.name ?? "",
			directories: assignCollectionId(parseDirectories(collection.directories), collection.id),
		}));
		const fileIds = new Set<string>();
		hydrated.forEach((c) => collectFileIds(c.directories, fileIds));
		const iconsById = fileIds.size > 0 ? await findFileIconsByIds([...fileIds]) : {};
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
		const nowSec = Math.floor(Date.now() / 1000);
		const input: RagTransactionCreateInput = {
			ragName: data.ragName.trim(),
			collection,
			updatedBy: DEFAULT_RAG_UPDATED_BY,
			updatedAt: nowSec,
		};
		const result = await ragRepo.create(input);
		return { success: true, data: result };
	} catch (error) {
		console.error("Failed to create RAG transaction:", error);
		return { success: false, error: "Failed to create RAG transaction" };
	}
}

export async function deleteRagTransaction(id: string) {
	try {
		const deleted = await ragRepo.delete(id);
		return { success: deleted, data: deleted };
	} catch (error) {
		console.error("Failed to delete RAG transaction:", error);
		return { success: false, error: "Failed to delete RAG transaction" };
	}
}
