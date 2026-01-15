"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, File, Star } from "lucide-react";
import type { TreeNode, TreeViewGroup } from "./@types/treeViewTypes";
import TreeNodeItem from "./TreeNodeItem";

export interface TreeViewGroupItemProps {
  group: TreeViewGroup;
  groupIndex: number;
  onNodeClick?: (node: TreeNode) => void;
  selectedNodePath: string | null;
  setSelectedNodePath: (path: string | null) => void;
  selectedNode: TreeNode | null;
  setSelectedNode: (node: TreeNode | null) => void;
  onAddFile?: (selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number) => void;
  onAddFolder?: (selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number) => void;
  isFavorited: boolean;
  onToggleFavorite: (groupIndex: number) => void;
}

export default function TreeViewGroupItem({
  group,
  groupIndex,
  onNodeClick,
  selectedNodePath,
  setSelectedNodePath,
  selectedNode,
  setSelectedNode,
  onAddFile,
  onAddFolder,
  isFavorited,
  onToggleFavorite,
}: TreeViewGroupItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="">
      <div
        className="flex items-center justify-between px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1">
          <span className="flex items-center justify-center w-4 h-4 transition-transform duration-200">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
          <span>{group.groupName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onAddFile?.(selectedNode, selectedNodePath, groupIndex);
            }}
            title="Add File"
          >
            <File className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </button>
          <button
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onAddFolder?.(selectedNode, selectedNodePath, groupIndex);
            }}
            title="Add Folder"
          >
            <Folder className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </button>
          <button
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(groupIndex);
            }}
            title="Favorite"
          >
            <Star
              className={`w-3.5 h-3.5 transition-colors ${
                isFavorited
                  ? "text-yellow-500 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            />
          </button>
        </div>
      </div>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-[10000px] opacity-100" : "max-h-0 opacity-0"
        }`}
        style={{
          transitionProperty: "max-height, opacity",
        }}
      >
        <div
          className={`pt-1 pl-4 transform transition-all duration-300 ease-in-out ${
            isExpanded ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
          }`}
        >
          {group.directories.map((node, index) => (
            <TreeNodeItem
              key={`${node.name}-${index}`}
              node={node}
              level={0}
              onNodeClick={onNodeClick}
              selectedNodePath={selectedNodePath}
              setSelectedNodePath={setSelectedNodePath}
              nodePath={node.name}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
            />
          ))}
        </div>
      </div>
    </div>
  );
}


