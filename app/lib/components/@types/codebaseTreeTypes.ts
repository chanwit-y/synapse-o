export interface CodebaseTreeNode {
  name: string;
  type: "directory" | "file";
  extension?: string;
  children?: CodebaseTreeNode[];
  // Full path for the node
  path?: string;
}

export interface ImportInfo {
  source: string;
  named?: { name: string; alias?: string }[];
  default?: string;
  namespace?: string;
  line?: number;
}

export interface CodebaseFileInfo {
  path: string;
  extension: string;
  metadata: {
    size_bytes: number;
    last_modified: string;
    md5: string;
  };
  line_counts?: {
    total: number;
    code: number;
    comment: number;
    blank: number;
  };
  type?: string;
  content?: string;
  description?: string;
  imports?: ImportInfo[];
  exports?: any[];
}

export interface CodebaseIndex {
  $schema: string;
  project: {
    name: string;
    root: string;
    indexed_at: string;
  };
  summary: {
    total_files: number;
    total_lines: number;
    total_code_lines: number;
    total_size_bytes: number;
    files_by_extension: Record<string, number>;
    languages: string[];
  };
  directory_tree: CodebaseTreeNode;
  files: CodebaseFileInfo[];
}
