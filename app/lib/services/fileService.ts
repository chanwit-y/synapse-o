/**
 * @file fileService.ts
 * @description Server-side file service handling file persistence, validation, and collection management with normalization logic.
 */
import "server-only";

import { CollectionRepository } from "@/app/lib/db/repository/collection";
import { FileRepository } from "@/app/lib/db/repository/file";
import type { SaveFileBody } from "@/app/lib/services/@types/fileService";
export type { SaveFileBody } from "@/app/lib/services/@types/fileService";

const DEFAULT_COLLECTION_ID = "default";
const DEFAULT_FILE_NAME = "untitled.md";

function getExtension(name: string) {
  const lastDotIndex = name.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === name.length - 1) return null;
  return name.slice(lastDotIndex + 1);
}

function normalizeSaveBody(body: SaveFileBody) {
  const content = typeof body.content === "string" ? body.content : "";
  const name = (body.name ?? DEFAULT_FILE_NAME).trim() || DEFAULT_FILE_NAME;
  const collectionId =
    (body.collectionId ?? DEFAULT_COLLECTION_ID).trim() || DEFAULT_COLLECTION_ID;
  const icon = typeof body.icon === "string" ? body.icon : null;
  const tags = Array.isArray(body.tags) ? body.tags : undefined;

  const fileId =
    typeof body.id === "string" && body.id.trim() ? body.id.trim() : null;

  const now = Date.now();
  const extension = getExtension(name);

  return { fileId, collectionId, name, content, icon, tags, now, extension };
}

async function ensureCollectionExists(collectionId: string) {
  const collectionRepo = new CollectionRepository();
  const existingCollection = await collectionRepo.findById(collectionId);
  if (existingCollection) return;

  await collectionRepo.create({
    id: collectionId,
    name: "Default",
    directories: JSON.stringify([]),
  });
}

export async function saveFile(body: SaveFileBody): Promise<{ id: string }> {
  const { fileId, collectionId, name, content, icon, tags, now, extension } =
    normalizeSaveBody(body);

  await ensureCollectionExists(collectionId);

  const fileRepo = new FileRepository();

  if (fileId) {
    const updated = await fileRepo.update(fileId, {
      name,
      content,
      extension,
      collectionId,
      ...(typeof icon === "string" ? { icon } : {}),
      ...(tags ? { tags } : {}),
      updatedAt: now,
    });

    if (updated) return { id: updated.id };
  }

  const created = await fileRepo.create({
    id: fileId ?? undefined,
    collectionId,
    name,
    type: "file",
    extension,
    icon,
    tags: tags ?? [],
    content,
    createdAt: now,
    updatedAt: now,
  });

  return { id: created.id };
}

export async function loadFile(id: string) {
  const fileRepo = new FileRepository();
  const file = await fileRepo.findById(id);
  if (!file) return null;

  // Ensure tags is always an array.
  const tags = Array.isArray(file.tags) ? file.tags : [];
  return { ...file, tags };
}

