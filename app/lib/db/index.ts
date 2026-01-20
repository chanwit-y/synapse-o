"use server";

import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import Database from "better-sqlite3";
import { TreeViewGroup } from "../components/TreeView";
import { collectionTable } from "./schema";

export async function testConnection() {
  const sqlite = new Database("synapse.db");
  const db = drizzle(sqlite);
  const result = db.all(sql`SELECT 1`);
  console.log("result", result);
}

const mockUuid = (() => {
  let i = 0;
  return () => `mock-uuid-${++i}`;
})();

const sampleTreeData: TreeViewGroup[] = [
  {
    id: mockUuid(),
    name: "group1",
    directories: [
      {
        id: mockUuid(),
        name: "docs",
        type: "folder",
        children: [
          {
            id: mockUuid(),
            name: "getting-started",
            type: "folder",
            children: [
              { id: mockUuid(), name: "introduction.md", type: "file" },
              { id: mockUuid(), name: "installation.md", type: "file" },
              { id: mockUuid(), name: "quick-start.md", type: "file" },
            ],
          },
          {
            id: mockUuid(),
            name: "guides",
            type: "folder",
            children: [
              { id: mockUuid(), name: "api-reference.md", type: "file" },
              { id: mockUuid(), name: "best-practices.md", type: "file" },
              { id: mockUuid(), name: "troubleshooting.md", type: "file" },
            ],
          },
          {
            id: mockUuid(),
            name: "examples",
            type: "folder",
            children: [
              { id: mockUuid(), name: "basic-usage.md", type: "file" },
              { id: mockUuid(), name: "advanced-features.md", type: "file" },
            ],
          },
          { id: mockUuid(), name: "changelog.md", type: "file" },
          { id: mockUuid(), name: "contributing.md", type: "file" },
        ],
      },
      {
        id: mockUuid(),
        name: "notes",
        type: "folder",
        children: [
          { id: mockUuid(), name: "meeting-notes.md", type: "file" },
          { id: mockUuid(), name: "ideas.md", type: "file" },
          { id: mockUuid(), name: "todo.md", type: "file" },
          {
            id: mockUuid(),
            name: "projects",
            type: "folder",
            children: [
              { id: mockUuid(), name: "project-alpha.md", type: "file" },
              { id: mockUuid(), name: "project-beta.md", type: "file" },
            ],
          },
        ],
      },
      {
        id: mockUuid(),
        name: "README.md",
        type: "file",
      },
    ],
  },
  {
    id: mockUuid(),
    name: "group2",
    directories: [
      {
        id: mockUuid(),
        name: "src",
        type: "folder",
        children: [
          {
            id: mockUuid(),
            name: "components",
            type: "folder",
            children: [
              { id: mockUuid(), name: "Button.tsx", type: "file" },
              { id: mockUuid(), name: "Card.tsx", type: "file" },
              { id: mockUuid(), name: "Modal.tsx", type: "file" },
            ],
          },
          {
            id: mockUuid(),
            name: "utils",
            type: "folder",
            children: [
              { id: mockUuid(), name: "helpers.ts", type: "file" },
              { id: mockUuid(), name: "constants.ts", type: "file" },
            ],
          },
          { id: mockUuid(), name: "index.ts", type: "file" },
        ],
      },
      {
        id: mockUuid(),
        name: "tests",
        type: "folder",
        children: [
          {
            id: mockUuid(),
            name: "unit",
            type: "folder",
            children: [{ id: mockUuid(), name: "test-utils.ts", type: "file" }],
          },
          {
            id: mockUuid(),
            name: "integration",
            type: "folder",
            children: [{ id: mockUuid(), name: "api.test.ts", type: "file" }],
          },
        ],
      },
    ],
  },
];

export async function createCollection() {
  const sqlite = new Database("synapse.db");
  const db = drizzle(sqlite);

  sampleTreeData.forEach(async (group) => {
    const collection = await db.insert(collectionTable).values({
      id: mockUuid(),
      name: group.name,
      directories: JSON.stringify(group.directories),
    }).returning();
    console.log("collection", collection);
  });

}
