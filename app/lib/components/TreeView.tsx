"use client";
/**
 * @file TreeView.tsx
 * @description Main tree view component that renders collection groups and manages node selection.
 */

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import TreeViewGroupItem from "./TreeViewGroupItem";
import type { TreeNode, TreeViewGroup } from "./@types/treeViewTypes";
import type { FileType } from "./TreeViewGroupItem";

interface TreeViewProps {
  data: TreeViewGroup[];
  onNodeClick?: (node: TreeNode, nodePath: string) => void;
  onAddFile?: (selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number, fileType: FileType) => void;
  onAddFolder?: (selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number) => void;
  onImportAzureMarkdown?: (selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number) => void;
  /** `false` = no PAT saved; `null` = not loaded yet (import allowed to avoid blocking). */
  azurePatConfigured?: boolean | null;
  onRequestDeleteNode?: (node: TreeNode, nodePath: string, groupIndex: number) => void;
  onAddFlow?: (flowName: string, selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number) => void;
  /**
   * Optional external selection control (by path). When provided, TreeView will
   * sync its internal selection highlight to this value.
   */
  selectedNodePath?: string | null;
  /** Fallback: when the path doesn't resolve to a node, search by ID instead. */
  selectedNodeId?: string | null;
  /** IDs of files that are already shown as sub-files (hidden from the main tree). */
  subFileContentIds?: Set<string>;
}

export default function TreeView({
  data,
  onNodeClick,
  onAddFile,
  onAddFolder,
  onImportAzureMarkdown,
  azurePatConfigured,
  onRequestDeleteNode,
  onAddFlow,
  selectedNodePath: externalSelectedNodePath,
  selectedNodeId: externalSelectedNodeId,
  subFileContentIds,
}: TreeViewProps) {
  const [selectedNodePath, setSelectedNodePath] = useState<string | null>(externalSelectedNodePath ?? null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const findNodeByPath = (nodes: TreeNode[], segments: string[]): TreeNode | null => {
    if (segments.length === 0) return null;
    const [head, ...rest] = segments;
    const current = nodes.find((n) => n.name === head) ?? null;
    if (!current) return null;
    if (rest.length === 0) return current;
    if (current.type !== "folder") return null;
    return findNodeByPath(current.children ?? [], rest);
  };

  const findNodeById = (nodes: TreeNode[], id: string, prefix: string[] = []): { node: TreeNode; path: string } | null => {
    for (const node of nodes) {
      const currentPath = [...prefix, node.name];
      if (node.id === id) return { node, path: currentPath.join("/") };
      if (node.type === "folder" && node.children?.length) {
        const found = findNodeById(node.children, id, currentPath);
        if (found) return found;
      }
    }
    return null;
  };

  useEffect(() => {
    if (externalSelectedNodePath === undefined) return;
    setSelectedNodePath(externalSelectedNodePath);
    if (!externalSelectedNodePath) {
      setSelectedNode(null);
      return;
    }
    const segments = externalSelectedNodePath.split("/").filter(Boolean);
    for (const group of data) {
      const found = findNodeByPath(group.directories, segments);
      if (found) {
        setSelectedNode(found);
        return;
      }
    }

    // Fallback: path didn't match any node — search by ID instead
    if (externalSelectedNodeId) {
      for (const group of data) {
        const match = findNodeById(group.directories, externalSelectedNodeId);
        if (match) {
          setSelectedNodePath(match.path);
          setSelectedNode(match.node);
          return;
        }
      }
    }
  }, [externalSelectedNodePath, externalSelectedNodeId, data]);

  const handleBackgroundClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-tree-interactive="true"]')) return;
    setSelectedNode(null);
    setSelectedNodePath(null);
  };

  return (
    <div className="h-full overflow-y-auto" onClick={handleBackgroundClick}>
      <div className="py-2">
        {data.map((group, groupIndex) => (
          <TreeViewGroupItem
            key={group.id}
            group={group}
            groupIndex={groupIndex}
            onNodeClick={onNodeClick}
            selectedNodePath={selectedNodePath}
            setSelectedNodePath={setSelectedNodePath}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            onAddFile={onAddFile}
            onAddFolder={onAddFolder}
            onImportAzureMarkdown={onImportAzureMarkdown}
            azurePatConfigured={azurePatConfigured}
            onRequestDeleteNode={onRequestDeleteNode}
            onAddFlow={onAddFlow}
            subFileContentIds={subFileContentIds}
          />
        ))}
      </div>
    </div>
  );
}

