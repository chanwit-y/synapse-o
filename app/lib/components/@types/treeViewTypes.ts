export interface TreeNode {
  name: string;
  type: "folder" | "file";
  children?: TreeNode[];
}

export interface TreeViewGroup {
  groupName: string;
  directories: TreeNode[];
}


