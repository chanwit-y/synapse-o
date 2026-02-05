/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import { inArray } from "drizzle-orm";
import { fileTable } from "@/app/lib/db/schema";
import { BaseRepository, type RepoOptions } from "@/app/lib/db/repository/base";
import type { Tag } from "../../components/@types/tagEditorTypes";

export type FileRow = typeof fileTable.$inferSelect;
export type FileInsert = typeof fileTable.$inferInsert;
export type FileCreateInput = Omit<FileInsert, "id"> & { id?: string };
export type FileUpdateInput = Partial<Omit<FileInsert, "id">>;

export class FileRepository extends BaseRepository<typeof fileTable, string> {
	constructor(opts: RepoOptions = {}) {
		super(fileTable, fileTable.id, "id", {
			...opts,
			idFactory: () => crypto.randomUUID(),
		});
	}

	public async updateIcon(id: string, icon: string | null, updatedAt: number = Date.now()) {
		return await this.update(id, { icon, updatedAt });
	}

	public async findByIds(ids: string[]): Promise<FileRow[]> {
		if (!ids.length) return [];
		return await this.db.select().from(this.table).where(inArray(fileTable.id, ids)).all();
	}

	public async updateTags(id: string, tags: Tag[]) {
		return await this.update(id, { tags });
	}
}

