"use server";

import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import Database from "better-sqlite3";
import type { TreeNode, TreeViewGroup } from "../components/@types/treeViewTypes";
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

const getExtension = (name: string) => {
  const lastDotIndex = name.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === name.length - 1) {
    return null;
  }
  return name.slice(lastDotIndex + 1);
};

const createFolder = (
  name: string,
  collectionId: string,
  children: TreeNode[] = []
): TreeNode => {
  return {
    tags: [],
    id: mockUuid(),
    collectionId,
    name,
    type: "folder",
    extension: null,
    children,
  };
};

const createFile = (
  name: string,
  collectionId: string,
  content?: string | null
): TreeNode => {
  const timestamp = Date.now();
  const file: TreeNode = {
    tags: [],
    id: mockUuid(),
    collectionId,
    name,
    type: "file",
    extension: getExtension(name),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  if (content !== undefined) {
    file.content = content;
  }
  return file;
};

const group1Id = "fec70d55-7391-45fd-8b07-706878b4b81d";
const group2Id = mockUuid();

const sampleTreeData: TreeViewGroup[] = [
  {
    id: group1Id,
    name: "group1",
    directories: [
      createFolder("docs", group1Id, [
        createFolder("getting-started", group1Id, [
          createFile("introduction.md", group1Id),
          createFile("installation.md", group1Id),
          createFile("quick-start.md", group1Id),
        ]),
        createFolder("guides", group1Id, [
          createFile("api-reference.md", group1Id),
          createFile("best-practices.md", group1Id),
          createFile("troubleshooting.md", group1Id),
        ]),
        createFolder("examples", group1Id, [
          createFile("basic-usage.md", group1Id),
          createFile("advanced-features.md", group1Id),
        ]),
        createFile("changelog.md", group1Id),
        createFile("contributing.md", group1Id),
      ]),
      createFolder("notes", group1Id, [
        createFile("meeting-notes.md", group1Id),
        createFile("ideas.md", group1Id),
        createFile("todo.md", group1Id),
        createFolder("projects", group1Id, [
          createFile("project-alpha.md", group1Id),
          createFile("project-beta.md", group1Id),
        ]),
      ]),
      createFile("README.md", group1Id),
    ],
  },
  {
    id: group2Id,
    name: "group2",
    directories: [
      createFolder("src", group2Id, [
        createFolder("components", group2Id, [
          createFile("Button.tsx", group2Id),
          createFile("Card.tsx", group2Id),
          createFile("Modal.tsx", group2Id),
        ]),
        createFolder("utils", group2Id, [
          createFile("helpers.ts", group2Id),
          createFile("constants.ts", group2Id),
        ]),
        createFile("index.ts", group2Id),
      ]),
      createFolder("tests", group2Id, [
        createFolder("unit", group2Id, [createFile("test-utils.ts", group2Id)]),
        createFolder("integration", group2Id, [
          createFile("api.test.ts", group2Id),
        ]),
      ]),
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
