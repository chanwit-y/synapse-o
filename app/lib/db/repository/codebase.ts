/**
 * @file codebase.ts
 * @description Codebase repository extending BaseRepository for managing codebase entities with UUID generation.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import { codebases } from "@/app/lib/db/schema";
import { BaseRepository, type RepoOptions } from "@/app/lib/db/repository/base";

export type CodebaseRow = typeof codebases.$inferSelect;
export type CodebaseInsert = typeof codebases.$inferInsert;
export type CodebaseCreateInput = Omit<CodebaseInsert, "id" | "createdAt" | "updatedAt"> & { id?: string };
export type CodebaseUpdateInput = Partial<Omit<CodebaseInsert, "id" | "createdAt" | "updatedAt">>;

export class CodebaseRepository extends BaseRepository<typeof codebases, string> {
	constructor(opts: RepoOptions = {}) {
		super(codebases, codebases.id, "id", {
			...opts,
			idFactory: () => crypto.randomUUID(),
		});
	}
}
