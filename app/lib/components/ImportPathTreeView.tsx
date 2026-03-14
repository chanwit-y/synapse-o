"use client";

import { useCallback, useMemo, useState } from "react";
import { ExternalLink, Search, X } from "lucide-react";
import "@xyflow/react/dist/style.css";

import { useTheme } from "./ThemeProvider";
import { ImportDetail } from "./import-path-tree-view/ImportDetail";
import { TreeNodeRow } from "./import-path-tree-view/TreeNodeRow";
import { buildTree, filterTree } from "./import-path-tree-view/helpers";
import type { DirNode, FileNode, ImportPathEntry } from "./import-path-tree-view/types";

export type { ImportEntry, ImportPathEntry } from "./import-path-tree-view/types";

interface ImportPathTreeViewProps {
  data: ImportPathEntry[];
  onCheckedPathsChange?: (paths: Set<string>) => void;
}

export default function ImportPathTreeView({ data, onCheckedPathsChange }: ImportPathTreeViewProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [search, setSearch] = useState("");
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [checkedPaths, setCheckedPaths] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  // const [selectedFileSet, setSelectedFileSet] = useState<Set<FileNode>>(new Set());

  const fullTree = useMemo(() => buildTree(data), [data]);

  const displayTree = useMemo(() => {
    if (!search.trim()) return fullTree;
    return filterTree(fullTree, search.trim());
  }, [fullTree, search]);

  const autoExpandedPaths = useMemo(() => {
    if (!search.trim()) return expandedPaths;
    const paths = new Set<string>();
    function collect(node: DirNode) {
      paths.add(node.fullPath);
      for (const child of node.children) {
        if (child.type === "dir") collect(child);
      }
    }
    collect(displayTree);
    return paths;
  }, [search, displayTree, expandedPaths]);

  const activeExpandedPaths = search.trim() ? autoExpandedPaths : expandedPaths;

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((previous) => {
      const next = new Set(previous);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleSelect = useCallback((node: FileNode) => {
    setSelectedFile(node);
  }, []);

  const handleToggleChecked = useCallback((node: FileNode) => {
    const path = node.fullPath;
    setCheckedPaths((previous) => {
      const next = new Set(previous);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      onCheckedPathsChange?.(next);
      return next;
    });
  }, [onCheckedPathsChange]);

  const totalFiles = data.length;
  const selectedCount = checkedPaths.size;
  const totalImports = useMemo(
    () => data.reduce((sum, entry) => sum + entry.imports.length, 0),
    [data]
  );
  const externalImports = useMemo(
    () =>
      data.reduce(
        (sum, entry) =>
          sum + entry.imports.filter((importEntry) => importEntry.is_external).length,
        0
      ),
    [data]
  );

  return (
    <div className="flex h-full min-h-0 w-full gap-4">
      <div
        className={[
          "flex h-full min-h-0 w-72 shrink-0 flex-col border-r",
          isLight ? "border-gray-200" : "border-gray-700",
        ].join(" ")}
      >
        <div
          className={[
            "shrink-0 border-b px-3 py-2",
            isLight ? "border-gray-200 bg-gray-50" : "border-gray-700 bg-gray-800/30",
          ].join(" ")}
        >
          <div className="flex gap-3 text-xs">
            <span className={isLight ? "text-gray-500" : "text-gray-400"}>
              <span className="font-semibold text-gray-700 dark:text-gray-200">{totalFiles}</span>{" "}
              files
            </span>
            <span className={isLight ? "text-gray-500" : "text-gray-400"}>
              <span className="font-semibold text-purple-600">{externalImports}</span> ext
            </span>
            <span className={isLight ? "text-gray-500" : "text-gray-400"}>
              <span className="font-semibold text-green-600">
                {totalImports - externalImports}
              </span>{" "}
              int
            </span>
            <span className={isLight ? "text-gray-500" : "text-gray-400"}>
              <span className="font-semibold text-blue-600">{selectedCount}</span> selected
            </span>
          </div>
        </div>

        <div
          className={[
            "shrink-0 border-b px-3 py-2",
            isLight ? "border-gray-200" : "border-gray-700",
          ].join(" ")}
        >
          <div
            className={[
              "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm",
              isLight ? "bg-gray-100" : "bg-gray-800",
            ].join(" ")}
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={[
                "flex-1 bg-transparent text-sm outline-none",
                isLight
                  ? "text-gray-700 placeholder-gray-400"
                  : "text-gray-200 placeholder-gray-500",
              ].join(" ")}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          {displayTree.children.length === 0 ? (
            <p
              className={[
                "mt-8 text-center text-sm",
                isLight ? "text-gray-400" : "text-gray-500",
              ].join(" ")}
            >
              No files match your search.
            </p>
          ) : (
            displayTree.children.map((child) => (
              <TreeNodeRow
                key={child.fullPath}
                node={child}
                depth={0}
                selectedPath={selectedFile?.fullPath ?? null}
                expandedPaths={activeExpandedPaths}
                checkedPaths={checkedPaths}
                onSelect={handleSelect}
                onToggle={handleToggle}
                onToggleChecked={handleToggleChecked}
                theme={theme}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex-2 h-full min-h-0 overflow-hidden">
        {selectedFile ? (
          <ImportDetail node={selectedFile} theme={theme} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <ExternalLink
                className={[
                  "mx-auto mb-3 h-10 w-10",
                  isLight ? "text-gray-300" : "text-gray-600",
                ].join(" ")}
              />
              <p
                className={[
                  "text-sm font-medium",
                  isLight ? "text-gray-500" : "text-gray-400",
                ].join(" ")}
              >
                Select a file to view its imports
              </p>
              <p
                className={[
                  "mt-1 text-xs",
                  isLight ? "text-gray-400" : "text-gray-500",
                ].join(" ")}
              >
                {totalFiles} files - {totalImports} imports total
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
