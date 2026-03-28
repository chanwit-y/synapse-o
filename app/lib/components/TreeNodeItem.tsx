"use client";
/**
 * @file TreeNodeItem.tsx
 * @description A recursive tree node component that renders individual files/folders with expand/collapse, deletion, and custom icon support.
 */

import { cloneElement, isValidElement, useEffect, useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, File, Trash2 } from "lucide-react";
import type { TreeNode } from "./@types/treeViewTypes";
import { useTheme } from "./ThemeProvider";
import { iconOptions } from "./iconOptions";
import { getSubFilesByFileId, deleteSubFile, type SubFileEntry } from "@/app/ui/doc/action";

const iconMap = new Map(iconOptions.map((option) => [option.id, option.icon]));

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
}: TreeNodeItemProps) {
  const { theme } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false);
  const [subFiles, setSubFiles] = useState<SubFileEntry[]>([]);
  const hasChildren = node.children && node.children.length > 0;
  const isFolder = node.type === "folder";
  const isFile = node.type === "file";

  if (isFile && subFileContentIds?.has(node.id)) return null;
  const indentLevel = level > 0 ? level * 20 + 8 : 8;

  const isSelected = selectedNodePath === nodePath;
  const iconClassName = `w-4 h-4 ${theme === 'light' ? "text-gray-500" : "text-gray-400"} shrink-0`;

  useEffect(() => {
    if (isFile) {
      getSubFilesByFileId(node.id).then(setSubFiles).catch(() => {});
    }
  }, [isFile, node.id]);

  useEffect(() => {
    if (!isFolder) return;
    if (!selectedNodePath) return;
    if (selectedNodePath === nodePath || selectedNodePath.startsWith(`${nodePath}/`)) {
      setIsExpanded(true);
    }
  }, [isFolder, nodePath, selectedNodePath]);

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

  const handleClick = () => {
    if (isFolder && hasChildren) {
      setIsExpanded(!isExpanded);
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
          customFileIcon ?? (
            <File className={`w-4 h-4 ${theme === 'light' ? "text-gray-500" : "text-gray-400"} shrink-0`} />
          )
        )}
        <span className="text-sm truncate flex-1 min-w-0" title={node.name}>
          {node.name}
        </span>
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
              />
            ))}
          </div>
        </div>
      )}
      {isFile && subFiles.length > 0 && (
        <div className="overflow-hidden">
          {subFiles.map((sf) => {
            const sfPath = `${nodePath}/${sf.fileName ?? sf.contentFileId}`;
            const sfIndent = (level + 1) * 20 + 8;
            const sfSelected = selectedNodePath === sfPath || selectedNode?.id === sf.contentFileId;
            const resolvedSfIcon = iconMap.get(sf.icon ?? "");
            const sfIconEl = isValidElement(resolvedSfIcon)
              ? cloneElement(resolvedSfIcon as React.ReactElement<any>, {
                  className: iconClassName,
                })
              : null;
            return (
              <div
                key={sf.subFileId}
                className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer transition-colors group/sub ${
                  sfSelected
                    ? theme === "light" ? "bg-blue-100 text-blue-700" : "bg-blue-900/30 text-blue-300"
                    : theme === "light" ? "hover:bg-gray-100 text-gray-700" : "hover:bg-gray-800 hover:text-gray-300"
                }`}
                style={{ paddingLeft: `${sfIndent}px` }}
                onClick={(e) => {
                  e.stopPropagation();
                  const subNode: TreeNode = {
                    id: sf.contentFileId,
                    collectionId: sf.collectionId ?? "",
                    name: sf.fileName ?? "Untitled",
                    type: "file",
                    icon: sf.icon,
                    extension: sf.extension,
                    tags: sf.tags,
                  };
                  setSelectedNodePath(sfPath);
                  setSelectedNode(subNode);
                  onNodeClick?.(subNode, sfPath);
                }}
                data-tree-interactive="true"
              >
                {sfIconEl ?? <File className={iconClassName} />}
                <span className="text-sm truncate flex-1 min-w-0" title={sf.fileName ?? "Untitled"}>
                  {sf.fileName ?? "Untitled"}
                </span>
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
                    setSubFiles((prev) => prev.filter((s) => s.subFileId !== sf.subFileId));
                  }}
                  aria-label="Remove sub-file"
                  title="Remove sub-file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


