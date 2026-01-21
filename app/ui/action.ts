"use server";

import type { TreeNode } from "@/app/lib/components/@types/treeViewTypes";
import { CollectionRepository, type CollectionRow } from "@/app/lib/db/repository/collection";

export async function findAllCollections(): Promise<CollectionRow[]> {
	const repo = new CollectionRepository();
	return await repo.findAll();
}

export async function createCollection(name: string): Promise<CollectionRow> {
	const repo = new CollectionRepository();
	return await repo.create({
		name,
		directories: JSON.stringify([]),
	});
}

export async function updateCollectionDirectories(
	collectionId: string,
	directories: TreeNode[],
): Promise<CollectionRow | null> {
	const repo = new CollectionRepository();
	return await repo.update(collectionId, {
		directories: JSON.stringify(directories ?? []),
	});
}
