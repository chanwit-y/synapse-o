import { Code, Code2, File, Globe } from "lucide-react";

import type { DirNode, ImportPathEntry, TreeNode } from "./types";

export function getFileIcon(name: string, className: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "tsx":
    case "jsx":
      return <Code2 className={className} />;
    case "ts":
    case "js":
    case "mjs":
    case "cjs":
      return <Code className={className} />;
    case "html":
    case "htm":
      return <Globe className={className} />;
    default:
      return <File className={className} />;
  }
}

export function buildTree(entries: ImportPathEntry[]): DirNode {
  const root: DirNode = { type: "dir", name: "", fullPath: "", children: [] };

  const paths = entries.map((entry) => entry.path);
  let commonParts: string[] = [];
  if (paths.length > 0) {
    commonParts = paths[0].split("/").filter(Boolean);
    for (const path of paths.slice(1)) {
      const parts = path.split("/").filter(Boolean);
      let idx = 0;
      while (
        idx < commonParts.length &&
        idx < parts.length &&
        commonParts[idx] === parts[idx]
      ) {
        idx++;
      }
      commonParts = commonParts.slice(0, idx);
    }
    if (commonParts.length > 1) commonParts = commonParts.slice(0, -1);
  }
  const prefixLen = commonParts.length;

  for (const entry of entries) {
    const parts = entry.path.split("/").filter(Boolean).slice(prefixLen);
    if (parts.length === 0) continue;

    let current: DirNode = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const segment = parts[i];
      let child = current.children.find(
        (candidate): candidate is DirNode =>
          candidate.type === "dir" && candidate.name === segment
      );
      if (!child) {
        child = {
          type: "dir",
          name: segment,
          fullPath: parts.slice(0, i + 1).join("/"),
          children: [],
        };
        current.children.push(child);
      }
      current = child;
    }

    const fileName = parts[parts.length - 1];
    current.children.push({
      type: "file",
      name: fileName,
      fullPath: parts.join("/"),
      entry,
    });
  }

  return root;
}

export function filterTree(node: DirNode, query: string): DirNode {
  const normalizedQuery = query.toLowerCase();
  const filteredChildren: TreeNode[] = [];

  for (const child of node.children) {
    if (child.type === "file") {
      if (child.fullPath.toLowerCase().includes(normalizedQuery)) {
        filteredChildren.push(child);
      }
      continue;
    }

    const filtered = filterTree(child, query);
    if (filtered.children.length > 0) {
      filteredChildren.push(filtered);
    }
  }

  return { ...node, children: filteredChildren };
}
