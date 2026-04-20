"use client";
/**
 * @file TreeNodeItem.tsx
 * @description A recursive tree node component that renders individual files/folders with expand/collapse, deletion, and custom icon support.
 */

import { cloneElement, isValidElement, useEffect, useState, type MouseEvent } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, File, Trash2 } from "lucide-react";
import type { TreeNode } from "./@types/treeViewTypes";
import { useTheme } from "./ThemeProvider";
import { iconOptions } from "./iconOptions";
import { getSubFilesByFileId, deleteSubFile, type SubFileEntry } from "@/app/ui/doc/action";

const iconMap = new Map(iconOptions.map((option) => [option.id, option.icon]));

export function isMarkdownTreeFile(node: TreeNode): boolean {
  if (node.type !== "file") return false;
  const lower = node.name.toLowerCase();
  return lower.endsWith(".md") || node.extension === "md";
}

export type MarkdownPickerMultiProps = {
  /** Keys are file IDs that are checked. Values are ignored; presence matters for `.has()`. */
  selectedByFileId: ReadonlyMap<string, unknown>;
  onToggle: (fileId: string, node: TreeNode, nodePath: string, checked: boolean) => void;
};

function SubFileItem({
  sf,
  parentNodePath,
  level,
  selectedNodePath,
  setSelectedNodePath,
  selectedNode,
  setSelectedNode,
  onNodeClick,
  onRemove,
  readOnlyTree,
  markdownPickerMulti,
  subFileContentIds,
}: {
  sf: SubFileEntry;
  parentNodePath: string;
  level: number;
  selectedNodePath: string | null;
  setSelectedNodePath: (path: string | null) => void;
  selectedNode: TreeNode | null;
  setSelectedNode: (node: TreeNode | null) => void;
  onNodeClick?: (node: TreeNode, nodePath: string) => void;
  onRemove: (subFileId: string) => void;
  readOnlyTree?: boolean;
  markdownPickerMulti?: MarkdownPickerMultiProps | null;
  subFileContentIds?: Set<string>;
}) {
  const { theme } = useTheme();
  const [nestedSubFiles, setNestedSubFiles] = useState<SubFileEntry[]>([]);
  const [isNestedExpanded, setIsNestedExpanded] = useState(false);

  const sfPath = `${parentNodePath}/${sf.fileName ?? sf.contentFileId}`;
  const sfIndent = (level + 1) * 20 + 8;
  const sfSelected = selectedNodePath === sfPath || selectedNode?.id === sf.contentFileId;
  const iconClassName = `w-4 h-4 ${theme === "light" ? "text-gray-500" : "text-gray-400"} shrink-0`;
  const resolvedSfIcon = iconMap.get(sf.icon ?? "");
  const sfIconEl = isValidElement(resolvedSfIcon)
    ? cloneElement(resolvedSfIcon as React.ReactElement<any>, { className: iconClassName })
    : null;
  const subNode: TreeNode = {
    id: sf.contentFileId,
    collectionId: sf.collectionId ?? "",
    name: sf.fileName ?? "Untitled",
    type: "file",
    icon: sf.icon,
    extension: sf.extension,
    tags: sf.tags,
  };
  const subIsMd = isMarkdownTreeFile(subNode);

  useEffect(() => {
    getSubFilesByFileId(sf.contentFileId).then(setNestedSubFiles).catch(() => {});
  }, [sf.contentFileId, subFileContentIds]);

  useEffect(() => {
    if (nestedSubFiles.length === 0) return;
    if (!selectedNodePath) return;
    if (selectedNodePath.startsWith(`${sfPath}/`)) {
      setIsNestedExpanded(true);
    }
  }, [nestedSubFiles.length, selectedNodePath, sfPath]);

  return (
    <>
      <div
        className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer transition-colors group/sub ${
          sfSelected
            ? theme === "light" ? "bg-blue-100 text-blue-700" : "bg-blue-900/30 text-blue-300"
            : theme === "light" ? "hover:bg-gray-100 text-gray-700" : "hover:bg-gray-800 hover:text-gray-300"
        }`}
        style={{ paddingLeft: `${sfIndent}px` }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("input[type='checkbox']")) return;
          e.stopPropagation();
          if (markdownPickerMulti && subIsMd) {
            const next = !markdownPickerMulti.selectedByFileId.has(subNode.id);
            markdownPickerMulti.onToggle(subNode.id, subNode, sfPath, next);
          }
          setSelectedNodePath(sfPath);
          setSelectedNode(subNode);
          onNodeClick?.(subNode, sfPath);
        }}
        data-tree-interactive="true"
      >
        {markdownPickerMulti && subIsMd && (
          <input
            type="checkbox"
            checked={markdownPickerMulti.selectedByFileId.has(subNode.id)}
            onChange={(ev) => {
              ev.stopPropagation();
              markdownPickerMulti.onToggle(subNode.id, subNode, sfPath, ev.target.checked);
            }}
            onClick={(ev) => ev.stopPropagation()}
            className={`h-4 w-4 shrink-0 rounded border cursor-pointer accent-blue-600 ${
              theme === "light" ? "border-gray-400" : "border-gray-500"
            }`}
            aria-label={`Select ${sf.fileName ?? "file"}`}
          />
        )}
        {nestedSubFiles.length > 0 && (
          <span
            className="flex items-center justify-center w-4 h-4 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsNestedExpanded((prev) => !prev);
            }}
          >
            {isNestedExpanded ? (
              <ChevronDown className={`w-3.5 h-3.5 ${theme === 'light' ? "text-gray-500" : "text-gray-400"}`} />
            ) : (
              <ChevronRight className={`w-3.5 h-3.5 ${theme === 'light' ? "text-gray-500" : "text-gray-400"}`} />
            )}
          </span>
        )}
        {sfIconEl ?? <File className={iconClassName} />}
        <span className="text-sm truncate flex-1 min-w-0" title={sf.fileName ?? "Untitled"}>
          {sf.fileName ?? "Untitled"}
        </span>
        {!readOnlyTree && (
          <button
            type="button"
            className={`ml-2 p-1 rounded transition-colors opacity-0 group-hover/sub:opacity-100 ${
              theme === "light"
                ? "text-gray-500 hover:text-red-600 hover:bg-red-50"
                : "text-gray-400 hover:text-red-400 hover:bg-red-900/20"
            }`}
            onClick={async (e) => {
              e.stopPropagation();
              await deleteSubFile(sf.subFileId);
              onRemove(sf.subFileId);
            }}
            aria-label="Remove sub-file"
            title="Remove sub-file"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {nestedSubFiles.length > 0 && (
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isNestedExpanded ? "max-h-[10000px] opacity-100" : "max-h-0 opacity-0"
          }`}
          style={{ transitionProperty: "max-height, opacity" }}
        >
          {nestedSubFiles.map((nested) => (
            <SubFileItem
              key={nested.subFileId}
              sf={nested}
              parentNodePath={sfPath}
              level={level + 1}
              selectedNodePath={selectedNodePath}
              setSelectedNodePath={setSelectedNodePath}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              onNodeClick={onNodeClick}
              onRemove={(id) => setNestedSubFiles((prev) => prev.filter((s) => s.subFileId !== id))}
              readOnlyTree={readOnlyTree}
              markdownPickerMulti={markdownPickerMulti}
              subFileContentIds={subFileContentIds}
            />
          ))}
        </div>
      )}
    </>
  );
}

export interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  onNodeClick?: (node: TreeNode, nodePath: string) => void;
  selectedNodePath: string | null;
  setSelectedNodePath: (path: string | null) => void;
  nodePath: string;
  selectedNode: TreeNode | null;
  setSelectedNode: (node: TreeNode | null) => void;
  groupIndex: number;
  onRequestDeleteNode?: (node: TreeNode, nodePath: string, groupIndex: number) => void;
  subFileContentIds?: Set<string>;
  readOnlyTree?: boolean;
  /** When set with readOnlyTree, `.md` files show a checkbox for multi-select (e.g. RAG picker). */
  markdownPickerMulti?: MarkdownPickerMultiProps | null;
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
  groupIndex,
  onRequestDeleteNode,
  subFileContentIds,
  readOnlyTree,
  markdownPickerMulti,
}: TreeNodeItemProps) {
  const { theme } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false);
  const [subFiles, setSubFiles] = useState<SubFileEntry[]>([]);
  const [isSubFilesExpanded, setIsSubFilesExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isFolder = node.type === "folder";
  const isFile = node.type === "file";

  const isScenarioFile = isFile && node.name.includes('.scenario.');
  if (isFile && (subFileContentIds?.has(node.id) || isScenarioFile)) return null;
  const indentLevel = level > 0 ? level * 20 + 8 : 8;

  const isSelected = selectedNodePath === nodePath;
  const iconClassName = `w-4 h-4 ${theme === 'light' ? "text-gray-500" : "text-gray-400"} shrink-0`;

  useEffect(() => {
    if (isFile) {
      getSubFilesByFileId(node.id).then(setSubFiles).catch(() => {});
    }
  }, [isFile, node.id, subFileContentIds]);

  useEffect(() => {
    if (!isFolder) return;
    if (!selectedNodePath) return;
    if (selectedNodePath === nodePath || selectedNodePath.startsWith(`${nodePath}/`)) {
      setIsExpanded(true);
    }
  }, [isFolder, nodePath, selectedNodePath]);

  useEffect(() => {
    if (!isFile || subFiles.length === 0) return;
    if (!selectedNodePath) return;
    if (selectedNodePath.startsWith(`${nodePath}/`)) {
      setIsSubFilesExpanded(true);
    }
  }, [isFile, nodePath, selectedNodePath, subFiles.length]);

  const resolvedIcon = node.type === "file" ? iconMap.get(node.icon ?? "") : null;
  const customFileIcon = isValidElement(resolvedIcon)
    ? cloneElement(resolvedIcon as React.ReactElement<any>, {
        className: [
          // (resolvedIcon as React.ReactElement<any>).props?.className ?? "", 
          iconClassName,
        ]
          .filter(Boolean)
          .join(" "),
        "aria-hidden": true,
      })
    : resolvedIcon ?? null;

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("input[type='checkbox']")) return;
    if (isFolder && hasChildren) {
      setIsExpanded(!isExpanded);
    }
    if (markdownPickerMulti && isFile && isMarkdownTreeFile(node)) {
      const next = !markdownPickerMulti.selectedByFileId.has(node.id);
      markdownPickerMulti.onToggle(node.id, node, nodePath, next);
    }
    setSelectedNodePath(nodePath);
    setSelectedNode(node);
    onNodeClick?.(node, nodePath);
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer transition-colors group ${isSelected
            ? theme === 'light' ? "bg-blue-100 text-blue-700 " : "bg-blue-900/30  text-blue-300"
            : theme === 'light' ? "hover:bg-gray-100 text-gray-700" : "hover:bg-gray-800 hover:text-gray-300"
          }`}
        style={{ paddingLeft: `${indentLevel}px` }}
        onClick={handleClick}
        data-tree-interactive="true"
      >
        {markdownPickerMulti && isFile && isMarkdownTreeFile(node) && (
          <input
            type="checkbox"
            checked={markdownPickerMulti.selectedByFileId.has(node.id)}
            onChange={(ev) => {
              ev.stopPropagation();
              markdownPickerMulti.onToggle(node.id, node, nodePath, ev.target.checked);
            }}
            onClick={(ev) => ev.stopPropagation()}
            className={`h-4 w-4 shrink-0 rounded border cursor-pointer accent-blue-600 ${
              theme === "light" ? "border-gray-400" : "border-gray-500"
            }`}
            aria-label={`Select ${node.name}`}
          />
        )}
        {isFolder && hasChildren && (
          <span className="flex items-center justify-center w-4 h-4">
            {isExpanded ? (
              <ChevronDown className={`w-3.5 h-3.5 ${theme === 'light' ? "text-gray-500" : "text-gray-400"}`} />
            ) : (
              <ChevronRight className={`w-3.5 h-3.5 ${theme === 'light' ? "text-gray-500" : "text-gray-400"}`} />
            )}
          </span>
        )}
        {isFile && subFiles.length > 0 && (
          <span
            className="flex items-center justify-center w-4 h-4 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsSubFilesExpanded((prev) => !prev);
            }}
          >
            {isSubFilesExpanded ? (
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
          customFileIcon ?? (
            <File className={`w-4 h-4 ${theme === 'light' ? "text-gray-500" : "text-gray-400"} shrink-0`} />
          )
        )}
        <span className="text-sm truncate flex-1 min-w-0" title={node.name}>
          {node.name}
        </span>
        {!readOnlyTree && (
          <button
            type="button"
            className={`ml-2 p-1 rounded transition-colors opacity-0 group-hover:opacity-100 ${theme === "light"
                ? "text-gray-500 hover:text-red-600 hover:bg-red-50"
                : "text-gray-400 hover:text-red-400 hover:bg-red-900/20"
              }`}
            onClick={(event) => {
              event.stopPropagation();
              onRequestDeleteNode?.(node, nodePath, groupIndex);
            }}
            aria-label={`Delete ${node.type}`}
            title={`Delete ${node.type}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {hasChildren && (
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[10000px] opacity-100" : "max-h-0 opacity-0"
            }`}
          style={{
            transitionProperty: "max-height, opacity",
          }}
        >
          <div
            className={`transform transition-all duration-300 ease-in-out ${isExpanded ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
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
                groupIndex={groupIndex}
                onRequestDeleteNode={onRequestDeleteNode}
                subFileContentIds={subFileContentIds}
                readOnlyTree={readOnlyTree}
                markdownPickerMulti={markdownPickerMulti}
              />
            ))}
          </div>
        </div>
      )}
      {isFile && subFiles.length > 0 && (
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isSubFilesExpanded ? "max-h-[10000px] opacity-100" : "max-h-0 opacity-0"
          }`}
          style={{ transitionProperty: "max-height, opacity" }}
        >
          {subFiles.map((sf) => (
            <SubFileItem
              key={sf.subFileId}
              sf={sf}
              parentNodePath={nodePath}
              level={level}
              selectedNodePath={selectedNodePath}
              setSelectedNodePath={setSelectedNodePath}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              onNodeClick={onNodeClick}
              onRemove={(id) => setSubFiles((prev) => prev.filter((s) => s.subFileId !== id))}
              readOnlyTree={readOnlyTree}
              markdownPickerMulti={markdownPickerMulti}
              subFileContentIds={subFileContentIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}


