import { sql } from "drizzle-orm";
import { integer, sqliteTable, text,  } from "drizzle-orm/sqlite-core";

export const collectionTable = sqliteTable("collection", {
	id: text("id").primaryKey(),
	name: text("name"),
	directories: text("directories", { mode: "json" }),
});

export const fileTable = sqliteTable("file", {
	id: text("id").primaryKey(),
	collectionId: text("collection_id").references(() => collectionTable.id),
	icon: text("icon"),
	name: text("name"),
	type: text("type"),
	tags: text("tags", { mode: "json" }),
	extension: text("extension"),
	content: text("content"),
	createdAt: integer("created_at").default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const apiKeyTable = sqliteTable("api_key", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description"),
	apiKey: text("api_key").notNull(),
	createdAt: integer("created_at").default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer("updated_at").default(sql`CURRENT_TIMESTAMP`),
});