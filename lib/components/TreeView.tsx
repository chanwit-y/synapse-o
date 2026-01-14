"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, File, Star } from "lucide-react";

export interface TreeNode {
  name: string;
  type: "folder" | "file";
  children?: TreeNode[];
}

export interface TreeViewGroup {
  groupName: string;
  directories: TreeNode[];
}

interface TreeViewProps {
  data: TreeViewGroup[];
  onNodeClick?: (node: TreeNode) => void;
  onAddFile?: (selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number) => void;
  onAddFolder?: (selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number) => void;
}

interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  onNodeClick?: (node: TreeNode) => void;
  selectedNodePath: string | null;
  setSelectedNodePath: (path: string | null) => void;
  nodePath: string;
  selectedNode: TreeNode | null;
  setSelectedNode: (node: TreeNode | null) => void;
}

function TreeNodeItem({ node, level, onNodeClick, selectedNodePath, setSelectedNodePath, nodePath, selectedNode, setSelectedNode }: TreeNodeItemProps) {
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
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
        }`}
        style={{ paddingLeft: `${indentLevel}px` }}
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
            <FolderOpen className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
          )
        ) : (
          <File className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
        )}
        <span className="text-sm truncate">
          {node.name}
        </span>
      </div>
      {hasChildren && (
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded 
              ? "max-h-[10000px] opacity-100" 
              : "max-h-0 opacity-0"
          }`}
          style={{
            transitionProperty: "max-height, opacity",
          }}
        >
          <div 
            className={`transform transition-all duration-300 ease-in-out ${
              isExpanded 
                ? "translate-y-0 opacity-100" 
                : "-translate-y-4 opacity-0"
            }`}
          >
            {node.children!.map((child, index) => (
              <TreeNodeItem
                key={`${child.name}-${index}`}
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

function TreeViewGroupItem({
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
  onToggleFavorite
}: {
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
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="">
      <div
        className="flex items-center justify-between px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1">
          <span className="flex items-center justify-center w-4 h-4 transition-transform duration-200">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
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
            <Star className={`w-3.5 h-3.5 transition-colors ${
              isFavorited 
                ? "text-yellow-500 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400" 
                : "text-gray-500 dark:text-gray-400"
            }`} />
          </button>
        </div>
      </div>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded 
            ? "max-h-[10000px] opacity-100" 
            : "max-h-0 opacity-0"
        }`}
        style={{
          transitionProperty: "max-height, opacity",
        }}
      >
        <div 
          className={`pt-1 pl-4 transform transition-all duration-300 ease-in-out ${
            isExpanded 
              ? "translate-y-0 opacity-100" 
              : "-translate-y-4 opacity-0"
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

