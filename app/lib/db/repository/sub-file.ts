import "server-only";

import { eq } from "drizzle-orm";
import { subFileTable } from "@/app/lib/db/schema";
import { BaseRepository, type RepoOptions } from "@/app/lib/db/repository/base";

export type SubFileRow = typeof subFileTable.$inferSelect;
export type SubFileInsert = typeof subFileTable.$inferInsert;

export class SubFileRepository extends BaseRepository<typeof subFileTable, string> {
	constructor(opts: RepoOptions = {}) {
		super(subFileTable, subFileTable.id, "id", {
			...opts,
			idFactory: () => crypto.randomUUID(),
		});
	}

	public async findByFileId(fileId: string): Promise<SubFileRow[]> {
		return await this.db
			.select()
			.from(this.table)
			.where(eq(subFileTable.fileId, fileId))
			.all();
	}

	public async deleteByFileId(fileId: string): Promise<number> {
		const result = await this.db
			.delete(this.table)
			.where(eq(subFileTable.fileId, fileId))
			.run();
		return result?.changes ?? 0;
	}

	public async deleteByContentFileId(contentFileId: string): Promise<number> {
		const result = await this.db
			.delete(this.table)
			.where(eq(subFileTable.contentFileId, contentFileId))
			.run();
		return result?.changes ?? 0;
	}

	public async findByContentFileId(contentFileId: string): Promise<SubFileRow | null> {
		const rows = await this.db
			.select()
			.from(this.table)
			.where(eq(subFileTable.contentFileId, contentFileId))
			.limit(1)
			.all();
		return rows[0] ?? null;
	}

	public async findAllContentFileIds(): Promise<string[]> {
		const rows = await this.db
			.select({ contentFileId: subFileTable.contentFileId })
			.from(this.table)
			.all();
		return rows
			.map((r) => r.contentFileId)
			.filter((id): id is string => !!id);
	}
}
