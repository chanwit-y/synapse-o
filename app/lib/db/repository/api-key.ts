/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import { apiKeyTable } from "@/app/lib/db/schema";
import { BaseRepository, type RepoOptions } from "@/app/lib/db/repository/base";

export type ApiKeyRow = typeof apiKeyTable.$inferSelect;
export type ApiKeyInsert = typeof apiKeyTable.$inferInsert;
export type ApiKeyCreateInput = Omit<ApiKeyInsert, "id" | "createdAt" | "updatedAt"> & { id?: string };
export type ApiKeyUpdateInput = Partial<Omit<ApiKeyInsert, "id" | "createdAt" | "updatedAt">>;

export class ApiKeyRepository extends BaseRepository<typeof apiKeyTable, string> {
	constructor(opts: RepoOptions = {}) {
		super(apiKeyTable, apiKeyTable.id, "id", {
			...opts,
			idFactory: () => crypto.randomUUID(),
		});
	}

}

