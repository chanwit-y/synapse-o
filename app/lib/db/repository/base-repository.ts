/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import type { AnySQLiteTable } from "drizzle-orm/sqlite-core";

export type RepoOptions = {
	db?: BetterSQLite3Database;
};

let _sqlite: Database.Database | null = null;
let _db: BetterSQLite3Database | null = null;

/**
 * Shared singleton Drizzle DB instance for server runtime usage.
 */
export function getDefaultDb(): BetterSQLite3Database {
	if (_db) return _db;

	if (!_sqlite) {
		const dbPath = process.env.SYNAPSE_DB_PATH ?? "synapse.db";
		_sqlite = new Database(dbPath);
		// Better concurrency behavior for SQLite in server runtimes.
		_sqlite.pragma("journal_mode = WAL");
	}

	_db = drizzle(_sqlite);
	return _db;
}

type BaseRepoCtorOptions<TId> = RepoOptions & {
	/**
	 * Optional ID factory used by `create()` when the input doesn't provide an ID.
	 */
	idFactory?: () => TId;
};

type SelectModel<TTable extends AnySQLiteTable> = TTable["$inferSelect"];
type InsertModel<TTable extends AnySQLiteTable> = TTable["$inferInsert"];

/**
 * Base repository for SQLite + Drizzle repos.
 * Provides a shared default DB instance, while allowing injection for tests.
 */
export abstract class BaseRepository<TTable extends AnySQLiteTable = AnySQLiteTable, TId = string> {
	protected readonly db: BetterSQLite3Database;
	protected readonly table: TTable;
	protected readonly idColumn: any;
	protected readonly idKey: string;
	protected readonly idFactory?: () => TId;

	constructor(table: TTable, idColumn: any, idKey: string, opts: BaseRepoCtorOptions<TId> = {}) {
		this.db = opts.db ?? getDefaultDb();
		this.table = table;
		this.idColumn = idColumn;
		this.idKey = idKey;
		this.idFactory = opts.idFactory;
	}

	async findAll(): Promise<SelectModel<TTable>[]> {
		return await this.db.select().from(this.table).all();
	}

	async findById(id: TId): Promise<SelectModel<TTable> | null> {
		const row = await this.db.select().from(this.table).where(eq(this.idColumn, id as any)).get();
		return (row ?? null) as SelectModel<TTable> | null;
	}

	/**
	 * Create a row.
	 * - If the input doesn't provide an ID at `idKey`, `idFactory` (if provided) will be used.
	 */
	async create(input: Partial<InsertModel<TTable>> & Record<string, unknown>): Promise<SelectModel<TTable>> {
		const providedId = (input as any)[this.idKey] as TId | undefined;
		const id = (providedId ?? this.idFactory?.()) as TId | undefined;

		if (id == null) {
			throw new Error(`Missing id for create(): expected input["${this.idKey}"] or idFactory`);
		}

		await this.db
			.insert(this.table)
			.values({
				...(input as any),
				[this.idKey]: id,
			})
			.run();

		const created = await this.findById(id);
		if (!created) {
			throw new Error("Failed to create row");
		}
		return created;
	}

	async update(id: TId, patch: Partial<InsertModel<TTable>>): Promise<SelectModel<TTable> | null> {
		const result = await this.db
			.update(this.table)
			.set(patch as any)
			.where(eq(this.idColumn, id as any))
			.run();

		if ((result?.changes ?? 0) === 0) return null;
		return await this.findById(id);
	}

	async delete(id: TId): Promise<boolean> {
		const result = await this.db.delete(this.table).where(eq(this.idColumn, id as any)).run();
		return (result?.changes ?? 0) > 0;
	}
}


