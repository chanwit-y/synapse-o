"use client";
/**
 * @file TreeViewGroupItem.tsx
 * @description A collection group component with expand/collapse and add file/folder / Azure import controls.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronDown, Folder, FileText, Workflow, Table, CloudDownload, Code } from "lucide-react";
import type { TreeNode, TreeViewGroup } from "./@types/treeViewTypes";
import TreeNodeItem, { type MarkdownPickerMultiProps } from "./TreeNodeItem";
import { useTheme } from "./ThemeProvider";
import Modal from "./Modal";
import { useRouter } from "next/navigation";

export type FileType = "md" | "datatable" | "flow" | "code";

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
  onAddFlow?: (flowName: string, selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number) => void;
  subFileContentIds?: Set<string>;
  readOnlyTree?: boolean;
  markdownPickerMulti?: MarkdownPickerMultiProps | null;
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
  onAddFlow,
  subFileContentIds,
  readOnlyTree,
  markdownPickerMulti,
}: TreeViewGroupItemProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPatRequiredModalOpen, setIsPatRequiredModalOpen] = useState(false);
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [flowName, setFlowName] = useState("");
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => setContentHeight(el.scrollHeight);
    measure();

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

      {!readOnlyTree && (
        <Modal isOpen={isFlowModalOpen} onClose={() => { setIsFlowModalOpen(false); setFlowName(""); }} size="sm">
          <div className="space-y-4">
            <h3
              className={`text-lg font-semibold pr-8 ${
                theme === "light" ? "text-gray-900" : "text-gray-100"
              }`}
            >
              New Flow
            </h3>
            <div>
              <label
                htmlFor="flow-name-input"
                className={`block text-sm font-medium mb-1.5 ${
                  theme === "light" ? "text-gray-700" : "text-gray-300"
                }`}
              >
                Flow name
              </label>
              <input
                id="flow-name-input"
                type="text"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && flowName.trim()) {
                    onAddFlow?.(flowName.trim(), selectedNode, selectedNodePath, groupIndex);
                    setIsFlowModalOpen(false);
                    setFlowName("");
                  }
                }}
                placeholder="Enter flow name"
                autoFocus
                className={`w-full px-3 py-2 text-sm rounded-md border outline-none transition-colors ${
                  theme === "light"
                    ? "border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    : "border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                }`}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setIsFlowModalOpen(false); setFlowName(""); }}
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
                disabled={!flowName.trim()}
                onClick={() => {
                  onAddFlow?.(flowName.trim(), selectedNode, selectedNodePath, groupIndex);
                  setIsFlowModalOpen(false);
                  setFlowName("");
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </Modal>
      )}

      <div
        className={`flex items-center justify-between px-2 py-2 text-xs font-semibold text-gray-500 ${theme === "light" ? "text-gray-500" : "text-gray-400"} uppercase tracking-wide hover:bg-gray-100 ${theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-800"} rounded cursor-pointer transition-colors`}
        onClick={() => setIsExpanded(!isExpanded)}
        data-tree-interactive="true"
      >
        <div className="flex items-center gap-1 min-w-0 flex-1 mr-1">
          <span className="shrink-0 flex items-center justify-center w-4 h-4 transition-transform duration-200">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
          <span className="truncate" title={group.name}>{group.name}</span>
        </div>
        {!readOnlyTree && (
          <div className="shrink-0 flex items-center gap-0.5">
            <div
              className={`flex items-center gap-0.5 rounded-md px-0.5 ${
                theme === "light" ? "bg-gray-100" : "bg-gray-800"
              }`}
            >
              <button
                type="button"
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddFile?.(selectedNode, selectedNodePath, groupIndex, "md");
                }}
                title="Add Markdown File"
              >
                <FileText className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              </button>
              <button
                type="button"
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlowModalOpen(true);
                }}
                title="Add Flow"
              >
                <Workflow className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              </button>
              <button
                type="button"
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddFile?.(selectedNode, selectedNodePath, groupIndex, "datatable");
                }}
                title="Add Data Table"
              >
                <Table className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              </button>
              <button
                type="button"
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddFile?.(selectedNode, selectedNodePath, groupIndex, "code");
                }}
                title="Add Code File"
              >
                <Code className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              </button>
              <button
                type="button"
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  if (azurePatConfigured === false) {
                    setIsPatRequiredModalOpen(true);
                    return;
                  }
                  onImportAzureMarkdown?.(selectedNode, selectedNodePath, groupIndex);
                }}
                title="Import from Azure"
              >
                <CloudDownload className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <button
              type="button"
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onAddFolder?.(selectedNode, selectedNodePath, groupIndex);
              }}
              title="Add Folder"
            >
              <Folder className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        )}
      </div>
      <div
        className="transition-[height,opacity,transform] duration-300 ease-in-out will-change-[height,opacity,transform]"
        style={{
          height: isExpanded ? contentHeight : 0,
          opacity: isExpanded ? 1 : 0,
          transform: isExpanded ? "translateY(0px)" : "translateY(-8px)",
          overflow: "hidden",
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
              subFileContentIds={subFileContentIds}
              readOnlyTree={readOnlyTree}
              markdownPickerMulti={markdownPickerMulti}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
