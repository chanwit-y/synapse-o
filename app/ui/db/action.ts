"use server";
/**
 * @file action.ts
 * @description Server action to create a SQLite database table for storing device configuration data.
 */

import Database from "better-sqlite3";

let db: Database.Database | null = null;

function getDatabase() {
  if (!db) {
    db = new Database("synapse.db");
  }
  return db;
}

export async function createDevice() {
  const db = getDatabase();
  db.exec(`
	CREATE TABLE IF NOT EXISTS devices (
	  id INTEGER PRIMARY KEY AUTOINCREMENT,
	  name TEXT,
	  config JSON
	)
      `);
}
