"use client";
/**
 * @file TreeViewGroupItem.tsx
 * @description A collection group component with expand/collapse, add file/folder buttons, and favorite toggle functionality.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronDown, Folder, File, Star, FileText, Table } from "lucide-react";
import type { TreeNode, TreeViewGroup } from "./@types/treeViewTypes";
import TreeNodeItem from "./TreeNodeItem";
import { useTheme } from "./ThemeProvider";

export type FileType = "md" | "datatable";

export interface TreeViewGroupItemProps {
  group: TreeViewGroup;
  groupIndex: number;
  onNodeClick?: (node: TreeNode, nodePath: string) => void;
  selectedNodePath: string | null;
  setSelectedNodePath: (path: string | null) => void;
  selectedNode: TreeNode | null;
  setSelectedNode: (node: TreeNode | null) => void;
  onAddFile?: (selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number, fileType: FileType) => void;
  onAddFolder?: (selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number) => void;
  onRequestDeleteNode?: (node: TreeNode, nodePath: string, groupIndex: number) => void;
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
  onRequestDeleteNode,
  isFavorited,
  onToggleFavorite,
}: TreeViewGroupItemProps) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isFileTypeOpen, setIsFileTypeOpen] = useState(false);
  const fileTypeRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

  useEffect(() => {
    if (!isFileTypeOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (fileTypeRef.current && !fileTypeRef.current.contains(e.target as Node)) {
        setIsFileTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFileTypeOpen]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    // Measure on mount + when toggling.
    const measure = () => setContentHeight(el.scrollHeight);
    measure();

    // Keep height in sync when content changes (e.g., nodes added/removed).
    const ro = new ResizeObserver(() => {
      if (isExpanded) measure();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isExpanded, group.directories]);

  return (
    <div className="">
      <div
        className={`flex items-center justify-between px-2 py-2 text-xs font-semibold text-gray-500 ${theme === 'light' ? "text-gray-500" : "text-gray-400"} uppercase tracking-wide hover:bg-gray-100 ${theme === 'light' ? "hover:bg-gray-100" : "hover:bg-gray-800"} rounded cursor-pointer transition-colors`}
        onClick={() => setIsExpanded(!isExpanded)}
        data-tree-interactive="true"
      >
        <div className="flex items-center gap-1">
          <span className="flex items-center justify-center w-4 h-4 transition-transform duration-200">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
          <span title={group.name}>{group.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <div ref={fileTypeRef} className="relative">
            <button
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsFileTypeOpen((prev) => !prev);
              }}
              title="Add File"
            >
              <File className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            </button>
            {isFileTypeOpen && (
              <div
                className={`absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-md border shadow-lg py-1 ${
                  theme === "light"
                    ? "bg-white border-gray-200"
                    : "bg-gray-800 border-gray-700"
                }`}
              >
                {([
                  { value: "md" as FileType, label: "Markdown", icon: FileText },
                  { value: "datatable" as FileType, label: "Data Table", icon: Table },
                ]).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-colors ${
                      theme === "light"
                        ? "text-gray-700 hover:bg-gray-100"
                        : "text-gray-300 hover:bg-gray-700"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFileTypeOpen(false);
                      onAddFile?.(selectedNode, selectedNodePath, groupIndex, value);
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
              className={`w-3.5 h-3.5 transition-colors ${isFavorited
                  ? "text-yellow-500 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400"
                  : "text-gray-500 dark:text-gray-400"
                }`}
            />
          </button>
        </div>
      </div>
      <div
        className="overflow-hidden transition-[height,opacity,transform] duration-300 ease-in-out will-change-[height,opacity,transform]"
        style={{
          height: isExpanded ? contentHeight : 0,
          opacity: isExpanded ? 1 : 0,
          transform: isExpanded ? "translateY(0px)" : "translateY(-8px)",
        }}
      >
        <div ref={contentRef} className="pt-1 pl-4">
          {group.directories.map((node, index) => (
            <TreeNodeItem
              key={node.id}
              node={node}
              level={0}
              onNodeClick={onNodeClick}
              selectedNodePath={selectedNodePath}
              setSelectedNodePath={setSelectedNodePath}
              nodePath={node.name}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              groupIndex={groupIndex}
              onRequestDeleteNode={onRequestDeleteNode}
            />
          ))}
        </div>
      </div>
    </div>
  );
}


