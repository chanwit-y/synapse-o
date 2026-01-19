export interface TreeNode {
  id: string;
  name: string;
  type: "folder" | "file";
  children?: TreeNode[];
}

export interface TreeViewGroup {
  id: string;
  name: string;
  directories: TreeNode[];
}


