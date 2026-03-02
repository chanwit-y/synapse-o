import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";

import { getFileIcon } from "./helpers";
import type { FileNode, TreeNode } from "./types";

interface TreeNodeRowProps {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  checkedPaths: Set<string>;
  onSelect: (node: FileNode) => void;
  onToggle: (path: string) => void;
  onToggleChecked: (node: FileNode) => void;
  theme: string;
}

export function TreeNodeRow({
  node,
  depth,
  selectedPath,
  expandedPaths,
  checkedPaths,
  onSelect,
  onToggle,
  onToggleChecked,
  theme,
}: TreeNodeRowProps) {
  const isLight = theme === "light";
  const indent = depth * 16;

  if (node.type === "dir") {
    const isExpanded = expandedPaths.has(node.fullPath);
    return (
      <>
        <button
          onClick={() => onToggle(node.fullPath)}
          className={[
            "flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-sm",
            "transition-colors duration-150",
            isLight
              ? "text-gray-700 hover:bg-gray-100"
              : "text-gray-300 hover:bg-gray-800",
          ].join(" ")}
          style={{ paddingLeft: `${indent + 8}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          )}
          <span className="truncate font-medium">{node.name}</span>
          <span
            className={[
              "ml-auto shrink-0 text-xs",
              isLight ? "text-gray-400" : "text-gray-500",
            ].join(" ")}
          >
            {node.children.length}
          </span>
        </button>
        {isExpanded &&
          node.children.map((child) => (
            <TreeNodeRow
              key={child.fullPath}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              checkedPaths={checkedPaths}
              onSelect={onSelect}
              onToggle={onToggle}
              onToggleChecked={onToggleChecked}
              theme={theme}
            />
          ))}
      </>
    );
  }

  const isSelected = selectedPath === node.fullPath;
  const isChecked = checkedPaths.has(node.fullPath);

  return (
    <button
      onClick={() => onSelect(node)}
      className={[
        "flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-sm",
        "transition-colors duration-150",
        isSelected
          ? isLight
            ? "bg-blue-100 text-blue-800"
            : "bg-blue-900/40 text-blue-200"
          : isLight
            ? "text-gray-600 hover:bg-gray-100"
            : "text-gray-400 hover:bg-gray-800",
      ].join(" ")}
      style={{ paddingLeft: `${indent + 8}px` }}
    >
      <input
        type="checkbox"
        checked={isChecked}
        onChange={() => onToggleChecked(node)}
        onClick={(event) => event.stopPropagation()}
        className="h-3.5 w-3.5 shrink-0 cursor-pointer"
      />
      {getFileIcon(node.name, "h-3.5 w-3.5 shrink-0 text-sky-400")}
      <span className="truncate">{node.name}</span>
      {node.entry.imports.length > 0 && (
        <span
          className={[
            "ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-xs",
            isSelected
              ? "bg-blue-200 text-blue-800"
              : isLight
                ? "bg-gray-200 text-gray-600"
                : "bg-gray-700 text-gray-400",
          ].join(" ")}
        >
          {node.entry.imports.length}
        </span>
      )}
    </button>
  );
}
