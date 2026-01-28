"use server";

import { Tag } from "@/app/lib/components/@types/tagEditorTypes";
import type { TreeNode } from "@/app/lib/components/@types/treeViewTypes";
import { CollectionRepository, type CollectionRow } from "@/app/lib/db/repository/collection";
import { FileRepository, type FileRow } from "@/app/lib/db/repository/file";


// class Action {
// 	private collectionRepo: CollectionRepository;
// 	private fileRepo: FileRepository;

// 	constructor() {
// 		this.collectionRepo = new CollectionRepository();
// 		this.fileRepo = new FileRepository();
// 	}

// 	public async findAllCollections(): Promise<CollectionRow[]> {
// 		return await this.collectionRepo.findAll();
// 	}

// }

// const action = new Action()

// export function docAction() {
// 	return action;
// }


const collectionRepo = new CollectionRepository();
const fileRepo = new FileRepository();

export async function findAllCollections(): Promise<CollectionRow[]> {
	return await collectionRepo.findAll();
}

export async function createCollection(name: string): Promise<CollectionRow> {
	return await collectionRepo.create({
		name,
		directories: JSON.stringify([]),
	});
}

export async function updateCollectionDirectories(
	collectionId: string,
	directories: TreeNode[],
): Promise<CollectionRow | null> {
	return await collectionRepo.update(collectionId, {
		directories: JSON.stringify(directories ?? []),
	});
}

export async function updateFileIcon(fileId: string, icon: string | null): Promise<FileRow | null> {
	return await fileRepo.updateIcon(fileId, icon, Date.now());
}

export async function findFileIconsByIds(ids: string[]): Promise<Record<string, string | null>> {
	if (!ids?.length) return {};
	const rows = await fileRepo.findByIds(ids);
	return rows.reduce<Record<string, string | null>>((acc, row) => {
		acc[row.id] = row.icon ?? null;
		return acc;
	}, {});
}

export async function updateFileTags(fileId: string, tags: Tag[]): Promise<FileRow | null> {
	return await fileRepo.updateTags(fileId, tags);
}