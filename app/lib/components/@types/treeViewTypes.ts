/**
 * @file treeViewTypes.ts
 * @description Type definitions for tree view structures including TreeNode (file/folder) and TreeViewGroup interfaces.
 */
import { Tag } from "./tagEditorTypes";

export interface TreeNode {
  tags: Tag[];
  id: string;
  collectionId: string;
  name: string;
  type: "folder" | "file";
  icon?: string | null;
  extension: string | null;
  content?: string | null;
  createdAt?: number;
  updatedAt?: number;
  children?: TreeNode[];
}

export interface TreeViewGroup {
  id: string;
  name: string;
  directories: TreeNode[];
}


