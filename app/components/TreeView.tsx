"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, File } from "lucide-react";

export interface TreeNode {
  name: string;
  type: "folder" | "file";
  children?: TreeNode[];
}

interface TreeViewProps {
  data: TreeNode[];
  onNodeClick?: (node: TreeNode) => void;
}

interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  onNodeClick?: (node: TreeNode) => void;
}

function TreeNodeItem({ node, level, onNodeClick }: TreeNodeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isFolder = node.type === "folder";

  const handleClick = () => {
    if (isFolder && hasChildren) {
      setIsExpanded(!isExpanded);
    }
    onNodeClick?.(node);
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer transition-colors group"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {isFolder && hasChildren && (
          <span className="flex items-center justify-center w-4 h-4">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            )}
          </span>
        )}
        {!isFolder && hasChildren && (
          <span className="w-4 h-4" />
        )}
        {isFolder ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
          )
        ) : (
          <File className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        )}
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
          {node.name}
        </span>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child, index) => (
            <TreeNodeItem
              key={`${child.name}-${index}`}
              node={child}
              level={level + 1}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreeView({ data, onNodeClick }: TreeViewProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="py-2">
        {data.map((node, index) => (
          <TreeNodeItem
            key={`${node.name}-${index}`}
            node={node}
            level={0}
            onNodeClick={onNodeClick}
          />
        ))}
      </div>
    </div>
  );
}

