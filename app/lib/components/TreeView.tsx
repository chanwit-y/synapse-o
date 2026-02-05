"use client";

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import TreeViewGroupItem from "./TreeViewGroupItem";
import type { TreeNode, TreeViewGroup } from "./@types/treeViewTypes";

interface TreeViewProps {
  data: TreeViewGroup[];
  onNodeClick?: (node: TreeNode, nodePath: string) => void;
  onAddFile?: (selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number) => void;
  onAddFolder?: (selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number) => void;
  onRequestDeleteNode?: (node: TreeNode, nodePath: string, groupIndex: number) => void;
  /**
   * Optional external selection control (by path). When provided, TreeView will
   * sync its internal selection highlight to this value.
   */
  selectedNodePath?: string | null;
}

export default function TreeView({
  data,
  onNodeClick,
  onAddFile,
  onAddFolder,
  onRequestDeleteNode,
  selectedNodePath: externalSelectedNodePath,
}: TreeViewProps) {
  const [selectedNodePath, setSelectedNodePath] = useState<string | null>(externalSelectedNodePath ?? null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [favoritedGroups, setFavoritedGroups] = useState<Set<number>>(new Set());

  const findNodeByPath = (nodes: TreeNode[], segments: string[]): TreeNode | null => {
    if (segments.length === 0) return null;
    const [head, ...rest] = segments;
    const current = nodes.find((n) => n.name === head) ?? null;
    if (!current) return null;
    if (rest.length === 0) return current;
    if (current.type !== "folder") return null;
    return findNodeByPath(current.children ?? [], rest);
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
  }, [externalSelectedNodePath, data]);

  const handleBackgroundClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-tree-interactive="true"]')) return;
    setSelectedNode(null);
    setSelectedNodePath(null);
  };

  const handleToggleFavorite = (groupIndex: number) => {
    setFavoritedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupIndex)) {
        newSet.delete(groupIndex);
      } else {
        newSet.add(groupIndex);
      }
      return newSet;
    });
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
            onRequestDeleteNode={onRequestDeleteNode}
            isFavorited={favoritedGroups.has(groupIndex)}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
}

