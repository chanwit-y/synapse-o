"use server";
/**
 * @file action.ts
 * @description Server action module providing functions for managing collections and files, including CRUD operations, file tagging, icon updates, and AI unit testing.
 */

import type { Tag } from "@/app/lib/components/@types/tagEditorTypes";
import type { TreeNode } from "@/app/lib/components/@types/treeViewTypes";
import { CollectionRepository, type CollectionRow } from "@/app/lib/db/repository/collection";
import { FileRepository, type FileRow } from "@/app/lib/db/repository/file";
import { SubFileRepository, type SubFileRow } from "@/app/lib/db/repository/sub-file";
import { aiUnitTest } from "@/app/lib/services/ai";


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
const subFileRepo = new SubFileRepository();

export async function findAllCollections(): Promise<CollectionRow[]> {
	return await collectionRepo.findAll();
}

export async function createCollection(name: string): Promise<CollectionRow> {
	return await collectionRepo.create({
		name,
		directories: JSON.stringify([]),
	});
}

export async function findCollectionById(collectionId: string): Promise<CollectionRow | null> {
	if (!collectionId?.trim()) return null;
	return await collectionRepo.findById(collectionId);
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

export async function testAI(prompt: string) {
	return await aiUnitTest(prompt);
}

export async function createSubFile(fileId: string, contentFileId: string): Promise<SubFileRow> {
	const now = Date.now();
	return await subFileRepo.create({
		fileId,
		contentFileId,
		createdAt: now,
		updatedAt: now,
	});
}

export async function deleteSubFile(subFileId: string): Promise<boolean> {
	if (!subFileId?.trim()) return false;
	return await subFileRepo.delete(subFileId.trim());
}

export async function getAllSubFileContentIds(): Promise<string[]> {
	return await subFileRepo.findAllContentFileIds();
}

export type SubFileEntry = {
	subFileId: string;
	contentFileId: string;
	collectionId: string | null;
	fileName: string | null;
	icon: string | null;
	extension: string | null;
	tags: { id: string; label: string; color: string }[];
	createdAt: number | null;
};

export type ParentFileInfo = {
	parentFileId: string;
	parentFileName: string;
	parentCollectionId: string;
	parentIcon: string | null;
	parentExtension: string | null;
	parentTags: { id: string; label: string; color: string }[];
};

export async function getParentFile(contentFileId: string): Promise<ParentFileInfo | null> {
	if (!contentFileId?.trim()) return null;
	const subFileRow = await subFileRepo.findByContentFileId(contentFileId);
	if (!subFileRow?.fileId) return null;
	const parentRow = await fileRepo.findById(subFileRow.fileId);
	if (!parentRow) return null;
	const tags = Array.isArray(parentRow.tags)
		? (parentRow.tags as { id: string; label: string; color: string }[])
		: [];
	return {
		parentFileId: parentRow.id,
		parentFileName: parentRow.name ?? "Untitled",
		parentCollectionId: parentRow.collectionId ?? "",
		parentIcon: parentRow.icon ?? null,
		parentExtension: parentRow.extension ?? null,
		parentTags: tags,
	};
}

export async function getSubFilesByFileId(fileId: string): Promise<SubFileEntry[]> {
	if (!fileId?.trim()) return [];

	const subFiles = await subFileRepo.findByFileId(fileId);
	if (!subFiles.length) return [];

	const contentIds = subFiles
		.map((sf) => sf.contentFileId)
		.filter((id): id is string => !!id);

	const files = contentIds.length ? await fileRepo.findByIds(contentIds) : [];
	const fileMap = new Map(files.map((f) => [f.id, f]));

	return subFiles.map((sf) => {
		const file = sf.contentFileId ? fileMap.get(sf.contentFileId) : undefined;
		const tags = Array.isArray(file?.tags) ? (file.tags as { id: string; label: string; color: string }[]) : [];
		return {
			subFileId: sf.id,
			contentFileId: sf.contentFileId ?? "",
			collectionId: file?.collectionId ?? null,
			fileName: file?.name ?? null,
			icon: file?.icon ?? null,
			extension: file?.extension ?? null,
			tags,
			createdAt: sf.createdAt,
		};
	});
}