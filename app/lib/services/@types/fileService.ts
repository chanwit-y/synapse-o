/**
 * @file fileService.ts
 * @description Type definition for the SaveFileBody request structure with optional file metadata fields.
 */
export type SaveFileBody = {
  id?: string | null;
  collectionId?: string | null;
  name?: string | null;
  content?: string | null;
  icon?: string | null;
  tags?: unknown;
};
