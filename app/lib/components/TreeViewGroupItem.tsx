"use client";
/**
 * @file TreeViewGroupItem.tsx
 * @description A collection group component with expand/collapse, add file/folder buttons, and favorite toggle functionality.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronDown, Folder, File, Star, FileText, Table, CloudDownload } from "lucide-react";
import type { TreeNode, TreeViewGroup } from "./@types/treeViewTypes";
import TreeNodeItem from "./TreeNodeItem";
import { useTheme } from "./ThemeProvider";
import Modal from "./Modal";
import { useRouter } from "next/navigation";

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
  onImportAzureMarkdown?: (selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number) => void;
  /** When `false`, Azure import is blocked until PAT is saved in Settings. `null` = check not finished yet. */
  azurePatConfigured?: boolean | null;
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
  onImportAzureMarkdown,
  azurePatConfigured,
  onRequestDeleteNode,
  isFavorited,
  onToggleFavorite,
}: TreeViewGroupItemProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPatRequiredModalOpen, setIsPatRequiredModalOpen] = useState(false);
  const [isFileTypeOpen, setIsFileTypeOpen] = useState(false);
  const fileTypeRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);
  const MAX_EXPANDED_HEIGHT = 360;
  const expandedHeight = Math.min(contentHeight, MAX_EXPANDED_HEIGHT);
  const shouldScroll = contentHeight > MAX_EXPANDED_HEIGHT;

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
      <Modal isOpen={isPatRequiredModalOpen} onClose={() => setIsPatRequiredModalOpen(false)} size="sm">
        <div className="space-y-4">
          <h3
            className={`text-lg font-semibold pr-8 ${
              theme === "light" ? "text-gray-900" : "text-gray-100"
            }`}
          >
            Azure DevOps PAT required
          </h3>
          <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>
            To import from Azure DevOps, add a Personal Access Token (PAT) first. Open{" "}
            <span className="font-medium">Settings → Azure API Key</span>, save your PAT, then try again.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsPatRequiredModalOpen(false)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                theme === "light"
                  ? "text-gray-700 bg-gray-100 hover:bg-gray-200"
                  : "text-gray-300 bg-gray-700 hover:bg-gray-600"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPatRequiredModalOpen(false);
                router.push("/ui/settings/azure-api-key");
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Open settings
            </button>
          </div>
        </div>
      </Modal>

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
          <button
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (azurePatConfigured === false) {
                setIsPatRequiredModalOpen(true);
                return;
              }
              onImportAzureMarkdown?.(selectedNode, selectedNodePath, groupIndex);
            }}
            title="Import Markdown from Azure"
          >
            <CloudDownload className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </button>
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
        className="transition-[height,opacity,transform] duration-300 ease-in-out will-change-[height,opacity,transform]"
        style={{
          height: isExpanded ? expandedHeight : 0,
          opacity: isExpanded ? 1 : 0,
          transform: isExpanded ? "translateY(0px)" : "translateY(-8px)",
          overflowY: isExpanded && shouldScroll ? "auto" : "hidden",
          overflowX: "hidden",
        }}
      >
        <div ref={contentRef} className="pt-1 pl-4">
          {group.directories.map((node) => (
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


