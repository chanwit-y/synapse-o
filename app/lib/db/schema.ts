import { sqliteTable, text,  } from "drizzle-orm/sqlite-core";

export const collectionTable = sqliteTable("collection", {
	name: text(),
	directories: text("directories", { mode: "json" }),
});
