"use client";

import { useState } from "react";
import TreeViewGroupItem from "./TreeViewGroupItem";
import type { TreeNode, TreeViewGroup } from "./@types/treeViewTypes";

export type { TreeNode, TreeViewGroup } from "./@types/treeViewTypes";

interface TreeViewProps {
  data: TreeViewGroup[];
  onNodeClick?: (node: TreeNode) => void;
  onAddFile?: (selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number) => void;
  onAddFolder?: (selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number) => void;
}

export default function TreeView({ data, onNodeClick, onAddFile, onAddFolder }: TreeViewProps) {
  const [selectedNodePath, setSelectedNodePath] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [favoritedGroups, setFavoritedGroups] = useState<Set<number>>(new Set());

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
    <div className="h-full overflow-y-auto">
      <div className="py-2">
        {data.map((group, groupIndex) => (
          <TreeViewGroupItem
            key={`group-${group.groupName}-${groupIndex}`}
            group={group}
            groupIndex={groupIndex}
            onNodeClick={onNodeClick}
            selectedNodePath={selectedNodePath}
            setSelectedNodePath={setSelectedNodePath}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            onAddFile={onAddFile}
            onAddFolder={onAddFolder}
            isFavorited={favoritedGroups.has(groupIndex)}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
}

