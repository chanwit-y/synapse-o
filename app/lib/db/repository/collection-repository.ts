/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { collectionTable } from "@/app/lib/db/schema";
import { BaseRepository, type RepoOptions } from "@/app/lib/db/repository/base-repository";

export type CollectionRow = typeof collectionTable.$inferSelect;
export type CollectionInsert = typeof collectionTable.$inferInsert;
export type CollectionCreateInput = Omit<CollectionInsert, "id"> & { id?: string };
export type CollectionUpdateInput = Partial<Omit<CollectionInsert, "id">>;

export class CollectionRepo extends BaseRepository<typeof collectionTable, string> {
	constructor(opts: RepoOptions = {}) {
		super(collectionTable, collectionTable.id, "id", {
			...opts,
			idFactory: () => crypto.randomUUID(),
		});
	}

}

