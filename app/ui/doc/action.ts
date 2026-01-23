"use server";

import type { TreeNode } from "@/app/lib/components/@types/treeViewTypes";
import { CollectionRepository, type CollectionRow } from "@/app/lib/db/repository/collection";
import { FileRepository, type FileRow } from "@/app/lib/db/repository/file";

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

export async function updateFileIcon(fileId: string, icon: string | null): Promise<FileRow | null> {
	const repo = new FileRepository();
	return await repo.updateIcon(fileId, icon, Date.now());
}

export async function findFileIconsByIds(ids: string[]): Promise<Record<string, string | null>> {
	if (!ids?.length) return {};
	const repo = new FileRepository();
	const rows = await repo.findByIds(ids);
	return rows.reduce<Record<string, string | null>>((acc, row) => {
		acc[row.id] = row.icon ?? null;
		return acc;
	}, {});
}
