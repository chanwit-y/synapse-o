"use server";

import { CollectionRepository, type CollectionRow } from "@/app/lib/db/repository/collection";
import type { TreeNode } from "@/app/lib/components/@types/treeViewTypes";

export async function findAllCollections(): Promise<CollectionRow[]> {
	const repo = new CollectionRepository();
	return await repo.findAll();
}

export async function createCollection(name: string): Promise<CollectionRow> {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new Error("Collection name is required");
	}

	const repo = new CollectionRepository();
	return await repo.create({
		name: trimmed,
		// Note: `directories` column is `text(..., { mode: "json" })`, so pass real data (not JSON string).
		directories: [],
	});
}

export async function updateCollectionDirectories(
	collectionId: string,
	directories: TreeNode[],
): Promise<CollectionRow | null> {
	if (!collectionId) {
		throw new Error("collectionId is required");
	}

	const repo = new CollectionRepository();
	return await repo.update(collectionId, {
		// Note: pass real data; Drizzle will JSON-serialize for SQLite.
		directories,
	});
}
