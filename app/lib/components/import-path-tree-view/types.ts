export interface ImportEntry {
  items: string[];
  from: string;
  from_path: string;
  is_external: boolean;
  imports: ImportEntry[];
}

export interface ImportPathEntry {
  indent: number;
  path: string;
  imports: ImportEntry[];
}

export interface DirNode {
  type: "dir";
  name: string;
  fullPath: string;
  children: TreeNode[];
}

export interface FileNode {
  type: "file";
  name: string;
  fullPath: string;
  entry: ImportPathEntry;
}

export type TreeNode = DirNode | FileNode;
