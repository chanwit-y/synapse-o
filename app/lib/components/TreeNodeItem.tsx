"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, File } from "lucide-react";
import type { TreeNode } from "./@types/treeViewTypes";
import { useTheme } from "./ThemeProvider";

export interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  onNodeClick?: (node: TreeNode) => void;
  selectedNodePath: string | null;
  setSelectedNodePath: (path: string | null) => void;
  nodePath: string;
  selectedNode: TreeNode | null;
  setSelectedNode: (node: TreeNode | null) => void;
}

export default function TreeNodeItem({
  node,
  level,
  onNodeClick,
  selectedNodePath,
  setSelectedNodePath,
  nodePath,
  selectedNode,
  setSelectedNode,
}: TreeNodeItemProps) {
  const {theme} = useTheme()
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isFolder = node.type === "folder";
  // Add extra indentation for nested items (files/folders inside folders)
  const indentLevel = level > 0 ? level * 20 + 8 : 8;

  // Check if this node is selected by comparing the nodePath
  const isSelected = selectedNodePath === nodePath;

  const handleClick = () => {
    if (isFolder && hasChildren) {
      setIsExpanded(!isExpanded);
    }
    setSelectedNodePath(nodePath);
    setSelectedNode(node);
    onNodeClick?.(node);
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer transition-colors group ${
          isSelected
            ? theme === 'light' ? "bg-blue-100 text-blue-700 " : "bg-blue-900/30  text-blue-300"
            : theme === 'light' ? "hover:bg-gray-100 text-gray-700" : "hover:bg-gray-800 hover:text-gray-300"
        }`}
        style={{ paddingLeft: `${indentLevel}px` }}
        onClick={handleClick}
        data-tree-interactive="true"
      >
        {isFolder && hasChildren && (
          <span className="flex items-center justify-center w-4 h-4">
            {isExpanded ? (
              <ChevronDown className={`w-3.5 h-3.5 ${theme === 'light' ? "text-gray-500" : "text-gray-400"}`} />
            ) : (
              <ChevronRight className={`w-3.5 h-3.5 ${theme === 'light' ? "text-gray-500" : "text-gray-400"}`} />
            )}
          </span>
        )}
        {!isFolder && hasChildren && <span className="w-4 h-4" />}
        {isFolder ? (
          isExpanded ? (
            <FolderOpen className={`w-4 h-4 ${theme === 'light' ? "text-blue-500" : "text-blue-400"} shrink-0`} />
          ) : (
            <Folder className={`w-4 h-4 ${theme === 'light' ? "text-blue-500" : "text-blue-400"} shrink-0`} />
          )
        ) : (
          <File className={`w-4 h-4 ${theme === 'light' ? "text-gray-500" : "text-gray-400"} shrink-0`} />
        )}
        <span className="text-sm truncate">{node.name}</span>
      </div>
      {hasChildren && (
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? "max-h-[10000px] opacity-100" : "max-h-0 opacity-0"
          }`}
          style={{
            transitionProperty: "max-height, opacity",
          }}
        >
          <div
            className={`transform transition-all duration-300 ease-in-out ${
              isExpanded ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
            }`}
          >
            {node.children!.map((child, index) => (
              <TreeNodeItem
                key={child.id}
                node={child}
                level={level + 1}
                onNodeClick={onNodeClick}
                selectedNodePath={selectedNodePath}
                setSelectedNodePath={setSelectedNodePath}
                nodePath={`${nodePath}/${child.name}`}
                selectedNode={selectedNode}
                setSelectedNode={setSelectedNode}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


