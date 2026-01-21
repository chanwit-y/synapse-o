/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import { fileTable } from "@/app/lib/db/schema";
import { BaseRepository, type RepoOptions } from "@/app/lib/db/repository/base";

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
}

