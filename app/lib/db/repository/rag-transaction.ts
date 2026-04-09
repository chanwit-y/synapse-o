/**
 * @file rag-transaction.ts
 * @description Repository for RAG transaction records (name, collection, audit fields).
 */
import "server-only";

import { ragTransactionTable } from "@/app/lib/db/schema";
import { BaseRepository, type RepoOptions } from "@/app/lib/db/repository/base";

export type RagTransactionRow = typeof ragTransactionTable.$inferSelect;
export type RagTransactionInsert = typeof ragTransactionTable.$inferInsert;
export type RagTransactionCreateInput = Omit<RagTransactionInsert, "id" | "updatedAt"> & {
	id?: string;
	/** Unix seconds; omit to use DB default (unreliable with SQLite INTEGER + CURRENT_TIMESTAMP). */
	updatedAt?: number;
};

export class RagTransactionRepository extends BaseRepository<typeof ragTransactionTable, string> {
	constructor(opts: RepoOptions = {}) {
		super(ragTransactionTable, ragTransactionTable.id, "id", {
			...opts,
			idFactory: () => crypto.randomUUID(),
		});
	}
}
