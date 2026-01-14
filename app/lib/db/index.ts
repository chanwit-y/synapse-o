"use server";

import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import Database from "better-sqlite3";

export async function testConnection() {
  const sqlite = new Database("synapse.db");
  const db = drizzle(sqlite);
  const result = db.all(sql`SELECT 1`);
  console.log("result", result);
}
