/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, eq, or } from "drizzle-orm";
import type { AnySQLiteTable } from "drizzle-orm/sqlite-core";
import { configService } from "@/app/lib/services/config/configService.server";

export type RepoOptions = {
	db?: BetterSQLite3Database;
};

export type WhereOperator = "and" | "or" | "" | null | undefined;

/**
 * Condition item used to build a Drizzle `where(...)` expression.
 *
 * Notes:
 * - `key` must match a column property on the table (e.g. `"id"`, `"name"`)
 * - `condition` is typically a Drizzle predicate like `eq`, `lt`, `like`, etc.
 * - `operator` combines this item with the *next* item; the last item's operator is ignored.
 */
export type WhereCondition<TTable extends AnySQLiteTable = AnySQLiteTable> = {
	key: keyof TTable["$inferSelect"] | string;
	value: unknown;
	condition: (column: any, value: any) => any;
	operator?: WhereOperator;
};

let _sqlite: Database.Database | null = null;
let _db: BetterSQLite3Database | null = null;

/**
 * Shared singleton Drizzle DB instance for server runtime usage.
 */
export function getDefaultDb(): BetterSQLite3Database {
	if (_db) return _db;

	if (!_sqlite) {
		const dbPath = configService.getEnv().dbPath;
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

	public constructor(table: TTable, idColumn: any, idKey: string, opts: BaseRepoCtorOptions<TId> = {}) {
		this.db = opts.db ?? getDefaultDb();
		this.table = table;
		this.idColumn = idColumn;
		this.idKey = idKey;
		this.idFactory = opts.idFactory;
	}

	public async findAll(): Promise<SelectModel<TTable>[]> {
		return await this.db.select().from(this.table).all();
	}

	public async findById(id: TId): Promise<SelectModel<TTable> | null> {
		const row = await this.db.select().from(this.table).where(eq(this.idColumn, id as any)).get();
		return (row ?? null) as SelectModel<TTable> | null;
	}

	/**
	 * Build a Drizzle `where(...)` expression from an array of conditions.
	 *
	 * Example:
	 * `repo.where([{ key: "id", value: "123", condition: eq, operator: "and" }, { key: "name", value: "John", condition: eq }])`
	 */
	public where(conditions: WhereCondition<TTable>[]): any | undefined {
		if (!conditions?.length) return undefined;

		const getColumn = (key: string) => {
			const col = (this.table as any)[key];
			if (!col) {
				throw new Error(
					`Unknown column "${key}" for table. Expected a key that exists on the Drizzle table object.`,
				);
			}
			return col;
		};

		let expr = conditions[0].condition(getColumn(String(conditions[0].key)), conditions[0].value);

		for (let i = 1; i < conditions.length; i++) {
			const prevOp = conditions[i - 1]?.operator;
			const op = prevOp === "or" ? "or" : "and"; // treat "", null, undefined as "and"
			const next = conditions[i].condition(getColumn(String(conditions[i].key)), conditions[i].value);
			expr = op === "or" ? or(expr, next) : and(expr, next);
		}

		return expr;
	}

	/**
	 * Select rows using `where(conditions)`.
	 */
	public async findWhere(conditions: WhereCondition<TTable>[]): Promise<SelectModel<TTable>[]> {
		const whereExpr = this.where(conditions);
		if (!whereExpr) return await this.findAll();
		return await this.db.select().from(this.table).where(whereExpr).all();
	}

	/**
	 * Select a single row using `where(conditions)`.
	 */
	public async findOneWhere(conditions: WhereCondition<TTable>[]): Promise<SelectModel<TTable> | null> {
		const whereExpr = this.where(conditions);
		if (!whereExpr) return null;
		const row = await this.db.select().from(this.table).where(whereExpr).get();
		return (row ?? null) as SelectModel<TTable> | null;
	}

	/**
	 * Create a row.
	 * - If the input doesn't provide an ID at `idKey`, `idFactory` (if provided) will be used.
	 */
	public async create(input: Partial<InsertModel<TTable>> & Record<string, unknown>): Promise<SelectModel<TTable>> {
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

	public async update(id: TId, patch: Partial<InsertModel<TTable>>): Promise<SelectModel<TTable> | null> {
		const result = await this.db
			.update(this.table)
			.set(patch as any)
			.where(eq(this.idColumn, id as any))
			.run();

		if ((result?.changes ?? 0) === 0) return null;
		return await this.findById(id);
	}

	public async delete(id: TId): Promise<boolean> {
		const result = await this.db.delete(this.table).where(eq(this.idColumn, id as any)).run();
		return (result?.changes ?? 0) > 0;
	}
}


