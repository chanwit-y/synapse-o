"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  Code2,
  Code,
  Globe,
  ExternalLink,
  Link2,
  Search,
  X,
  Package,
  List,
  Network,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImportEntry {
  items: string[];
  from: string;
  from_path: string;
  is_external: boolean;
}

export interface ImportPathEntry {
  indent: number;
  path: string;
  imports: ImportEntry[];
}

interface DirNode {
  type: "dir";
  name: string;
  fullPath: string;
  children: TreeNode[];
}

interface FileNode {
  type: "file";
  name: string;
  fullPath: string;
  entry: ImportPathEntry;
}

type TreeNode = DirNode | FileNode;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileIcon(name: string, className: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "tsx":
    case "jsx":
      return <Code2 className={className} />;
    case "ts":
    case "js":
    case "mjs":
    case "cjs":
      return <Code className={className} />;
    case "html":
    case "htm":
      return <Globe className={className} />;
    default:
      return <File className={className} />;
  }
}

function buildTree(entries: ImportPathEntry[]): DirNode {
  const root: DirNode = { type: "dir", name: "", fullPath: "", children: [] };

  const paths = entries.map((e) => e.path);
  let commonParts: string[] = [];
  if (paths.length > 0) {
    commonParts = paths[0].split("/").filter(Boolean);
    for (const p of paths.slice(1)) {
      const parts = p.split("/").filter(Boolean);
      let i = 0;
      while (i < commonParts.length && i < parts.length && commonParts[i] === parts[i]) i++;
      commonParts = commonParts.slice(0, i);
    }
    if (commonParts.length > 1) commonParts = commonParts.slice(0, -1);
  }
  const prefixLen = commonParts.length;

  for (const entry of entries) {
    const parts = entry.path.split("/").filter(Boolean).slice(prefixLen);
    if (parts.length === 0) continue;

    let current: DirNode = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const segment = parts[i];
      let child = current.children.find(
        (c): c is DirNode => c.type === "dir" && c.name === segment
      );
      if (!child) {
        child = {
          type: "dir",
          name: segment,
          fullPath: parts.slice(0, i + 1).join("/"),
          children: [],
        };
        current.children.push(child);
      }
      current = child;
    }

    const fileName = parts[parts.length - 1];
    current.children.push({
      type: "file",
      name: fileName,
      fullPath: parts.join("/"),
      entry,
    });
  }

  return root;
}

function filterTree(node: DirNode, query: string): DirNode {
  const q = query.toLowerCase();
  const filteredChildren: TreeNode[] = [];

  for (const child of node.children) {
    if (child.type === "file") {
      if (child.fullPath.toLowerCase().includes(q)) {
        filteredChildren.push(child);
      }
    } else {
      const filtered = filterTree(child, query);
      if (filtered.children.length > 0) {
        filteredChildren.push(filtered);
      }
    }
  }

  return { ...node, children: filteredChildren };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TreeNodeRow({
  node,
  depth,
  selectedPath,
  expandedPaths,
  checkedPaths,
  onSelect,
  onToggle,
  onToggleChecked,
  theme,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  checkedPaths: Set<string>;
  onSelect: (node: FileNode) => void;
  onToggle: (path: string) => void;
  onToggleChecked: (path: string) => void;
  theme: string;
}) {
  const isLight = theme === "light";
  const indent = depth * 16;

  if (node.type === "dir") {
    const isExpanded = expandedPaths.has(node.fullPath);
    return (
      <>
        <button
          onClick={() => onToggle(node.fullPath)}
          className={[
            "flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-left",
            "transition-colors duration-150",
            isLight ? "hover:bg-gray-100 text-gray-700" : "hover:bg-gray-800 text-gray-300",
          ].join(" ")}
          style={{ paddingLeft: `${indent + 8}px` }}
        >
          {isExpanded
            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
          {isExpanded
            ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            : <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
          <span className="truncate font-medium">{node.name}</span>
          <span className={["ml-auto text-xs shrink-0", isLight ? "text-gray-400" : "text-gray-500"].join(" ")}>
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
        "flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-left",
        "transition-colors duration-150",
        isSelected
          ? isLight
            ? "bg-blue-100 text-blue-800"
            : "bg-blue-900/40 text-blue-200"
          : isLight
          ? "hover:bg-gray-100 text-gray-600"
          : "hover:bg-gray-800 text-gray-400",
      ].join(" ")}
      style={{ paddingLeft: `${indent + 8}px` }}
    >
      <input
        type="checkbox"
        checked={isChecked}
        onChange={() => onToggleChecked(node.fullPath)}
        onClick={(e) => e.stopPropagation()}
        className="h-3.5 w-3.5 shrink-0 cursor-pointer"
      />
      {getFileIcon(node.name, "h-3.5 w-3.5 shrink-0 text-sky-400")}
      <span className="truncate">{node.name}</span>
      {node.entry.imports.length > 0 && (
        <span
          className={[
            "ml-auto text-xs px-1.5 py-0.5 rounded-full shrink-0",
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

// ─── Import Dependency Graph ───────────────────────────────────────────────────

function ImportDependencyGraph({
  imports,
  fileName,
  theme,
}: {
  imports: ImportEntry[];
  fileName: string;
  theme: string;
}) {
  const isLight = theme === "light";

  const V_GAP = 60;
  const SOURCE_X = 50;
  const TARGET_X = 380;

  const initialNodes = useMemo<Node[]>(() => {
    const totalHeight = Math.max((imports.length - 1) * V_GAP, 0);
    const centerY = totalHeight / 2;

    const sourceNode: Node = {
      id: "__source__",
      position: { x: SOURCE_X, y: centerY },
      data: { label: fileName },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        background: "#3b82f6",
        color: "white",
        border: "2px solid #1d4ed8",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: "600",
        padding: "8px 14px",
        width: 210,
        textAlign: "center" as const,
      },
    };

    const importNodes: Node[] = imports.map((imp, i) => ({
      id: `imp-${i}`,
      position: { x: TARGET_X, y: i * V_GAP },
      data: { label: imp.from },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        background: imp.is_external
          ? isLight ? "#faf5ff" : "#2e1065"
          : isLight ? "#f0fdf4" : "#052e16",
        color: imp.is_external
          ? isLight ? "#6b21a8" : "#e9d5ff"
          : isLight ? "#166534" : "#bbf7d0",
        border: `1.5px solid ${
          imp.is_external
            ? isLight ? "#a855f7" : "#7c3aed"
            : isLight ? "#22c55e" : "#16a34a"
        }`,
        borderRadius: "6px",
        fontSize: "11px",
        fontFamily: "ui-monospace, monospace",
        padding: "6px 10px",
        width: 230,
      },
    }));

    return [sourceNode, ...importNodes];
  }, [imports, fileName, isLight]);

  const initialEdges = useMemo<Edge[]>(() => {
    return imports.map((imp, i) => ({
      id: `e-${i}`,
      source: "__source__",
      target: `imp-${i}`,
      style: {
        stroke: imp.is_external
          ? isLight ? "#a855f7" : "#7c3aed"
          : isLight ? "#22c55e" : "#16a34a",
        strokeWidth: 1.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: imp.is_external
          ? isLight ? "#a855f7" : "#7c3aed"
          : isLight ? "#22c55e" : "#16a34a",
      },
    }));
  }, [imports, isLight]);

  const [rfNodes, , onNodesChange] = useNodesState(initialNodes);
  const [rfEdges, , onEdgesChange] = useEdgesState(initialEdges);

  if (imports.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className={["text-sm", isLight ? "text-gray-400" : "text-gray-500"].join(" ")}>
          No imports to display.
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        colorMode={isLight ? "light" : "dark"}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            if (n.id === "__source__") return "#3b82f6";
            const border = String(n.style?.border ?? "");
            return border.includes("a855f7") || border.includes("7c3aed")
              ? "#a855f7"
              : "#22c55e";
          }}
        />
      </ReactFlow>
    </div>
  );
}

// ─── Import Detail ─────────────────────────────────────────────────────────────

function ImportDetail({
  node,
  theme,
}: {
  node: FileNode;
  theme: string;
}) {
  const isLight = theme === "light";
  const [filter, setFilter] = useState<"all" | "external" | "internal">("all");
  const [view, setView] = useState<"list" | "graph">("list");

  const filtered = node.entry.imports.filter((imp) => {
    if (filter === "external") return imp.is_external;
    if (filter === "internal") return !imp.is_external;
    return true;
  });

  const externalCount = node.entry.imports.filter((i) => i.is_external).length;
  const internalCount = node.entry.imports.filter((i) => !i.is_external).length;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className={["px-4 py-3 border-b shrink-0", isLight ? "border-gray-200" : "border-gray-700"].join(" ")}>
        <div className="flex items-center gap-2 mb-1">
          {getFileIcon(node.name, "h-4 w-4 text-sky-400")}
          <span className="font-semibold text-sm truncate">{node.name}</span>
        </div>
        <div className={["text-xs truncate mb-3", isLight ? "text-gray-400" : "text-gray-500"].join(" ")}>
          {node.fullPath}
        </div>

        {/* Controls: filter tabs + view toggle */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 flex-1 flex-wrap">
            {(["all", "external", "internal"] as const).map((f) => {
              const count =
                f === "all"
                  ? node.entry.imports.length
                  : f === "external"
                  ? externalCount
                  : internalCount;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={[
                    "px-2.5 py-1 text-xs rounded-full font-medium transition-colors",
                    filter === f
                      ? isLight
                        ? "bg-gray-800 text-white"
                        : "bg-gray-100 text-gray-900"
                      : isLight
                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700",
                  ].join(" ")}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
                </button>
              );
            })}
          </div>

          {/* View toggle */}
          <div
            className={[
              "flex rounded-lg overflow-hidden border shrink-0",
              isLight ? "border-gray-200" : "border-gray-700",
            ].join(" ")}
          >
            <button
              onClick={() => setView("list")}
              title="List view"
              className={[
                "p-1.5 transition-colors",
                view === "list"
                  ? isLight
                    ? "bg-gray-800 text-white"
                    : "bg-gray-100 text-gray-900"
                  : isLight
                  ? "text-gray-500 hover:bg-gray-100"
                  : "text-gray-400 hover:bg-gray-800",
              ].join(" ")}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView("graph")}
              title="Graph view"
              className={[
                "p-1.5 transition-colors",
                view === "graph"
                  ? isLight
                    ? "bg-gray-800 text-white"
                    : "bg-gray-100 text-gray-900"
                  : isLight
                  ? "text-gray-500 hover:bg-gray-100"
                  : "text-gray-400 hover:bg-gray-800",
              ].join(" ")}
            >
              <Network className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {view === "list" ? (
        <div className="flex-1 overflow-auto min-h-0 p-3 flex flex-col gap-2">
          {filtered.length === 0 ? (
            <p className={["text-sm text-center mt-8", isLight ? "text-gray-400" : "text-gray-500"].join(" ")}>
              No imports found.
            </p>
          ) : (
            filtered.map((imp, i) => (
              <div
                key={i}
                className={[
                  "rounded-lg border p-3",
                  isLight ? "border-gray-200 bg-gray-50" : "border-gray-700 bg-gray-800/50",
                ].join(" ")}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  {imp.is_external
                    ? <Package className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                    : <Link2 className="h-3.5 w-3.5 text-green-400 shrink-0" />}
                  <span
                    className={[
                      "text-xs font-mono font-medium truncate",
                      imp.is_external
                        ? isLight ? "text-purple-700" : "text-purple-300"
                        : isLight ? "text-green-700" : "text-green-300",
                    ].join(" ")}
                  >
                    {imp.from}
                  </span>
                  <span
                    className={[
                      "ml-auto text-xs px-1.5 py-0.5 rounded shrink-0",
                      imp.is_external
                        ? isLight ? "bg-purple-100 text-purple-700" : "bg-purple-900/40 text-purple-300"
                        : isLight ? "bg-green-100 text-green-700" : "bg-green-900/40 text-green-300",
                    ].join(" ")}
                  >
                    {imp.is_external ? "external" : "internal"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {imp.items.map((item, j) => (
                    <span
                      key={j}
                      className={[
                        "text-xs font-mono px-1.5 py-0.5 rounded",
                        isLight ? "bg-gray-200 text-gray-700" : "bg-gray-700 text-gray-300",
                      ].join(" ")}
                    >
                      {item}
                    </span>
                  ))}
                </div>

                {!imp.is_external && imp.from_path && (
                  <div className={["mt-1.5 text-xs truncate", isLight ? "text-gray-400" : "text-gray-500"].join(" ")}>
                    {imp.from_path}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ImportDependencyGraph
            key={`${node.fullPath}::${filter}`}
            imports={filtered}
            fileName={node.name}
            theme={theme}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface ImportPathTreeViewProps {
  data: ImportPathEntry[];
}

export default function ImportPathTreeView({ data }: ImportPathTreeViewProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [search, setSearch] = useState("");
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [checkedPaths, setCheckedPaths] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);

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
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleSelect = useCallback((node: FileNode) => {
    setSelectedFile(node);
  }, []);

  const handleToggleChecked = useCallback((path: string) => {
    setCheckedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const totalFiles = data.length;
  const selectedCount = checkedPaths.size;
  const totalImports = useMemo(() => data.reduce((sum, e) => sum + e.imports.length, 0), [data]);
  const externalImports = useMemo(
    () => data.reduce((sum, e) => sum + e.imports.filter((i) => i.is_external).length, 0),
    [data]
  );

  return (
    <div className="flex h-full min-h-0 w-full gap-4">
      {/* Left: Tree panel */}
      <div
        className={[
          "flex flex-col w-72 shrink-0 border-r h-full min-h-0",
          isLight ? "border-gray-200" : "border-gray-700",
        ].join(" ")}
      >
        {/* Stats bar */}
        <div
          className={[
            "px-3 py-2 border-b shrink-0",
            isLight ? "border-gray-200 bg-gray-50" : "border-gray-700 bg-gray-800/30",
          ].join(" ")}
        >
          <div className="flex gap-3 text-xs">
            <span className={isLight ? "text-gray-500" : "text-gray-400"}>
              <span className="font-semibold text-gray-700 dark:text-gray-200">{totalFiles}</span> files
            </span>
            <span className={isLight ? "text-gray-500" : "text-gray-400"}>
              <span className="font-semibold text-purple-600">{externalImports}</span> ext
            </span>
            <span className={isLight ? "text-gray-500" : "text-gray-400"}>
              <span className="font-semibold text-green-600">{totalImports - externalImports}</span> int
            </span>
            <span className={isLight ? "text-gray-500" : "text-gray-400"}>
              <span className="font-semibold text-blue-600">{selectedCount}</span> selected
            </span>
          </div>
        </div>

        {/* Search */}
        <div className={["px-3 py-2 border-b shrink-0", isLight ? "border-gray-200" : "border-gray-700"].join(" ")}>
          <div
            className={[
              "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm",
              isLight ? "bg-gray-100" : "bg-gray-800",
            ].join(" ")}
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <input
              type="text"
              placeholder="Search files…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={[
                "flex-1 bg-transparent outline-none text-sm",
                isLight ? "text-gray-700 placeholder-gray-400" : "text-gray-200 placeholder-gray-500",
              ].join(" ")}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-auto min-h-0 p-2">
          {displayTree.children.length === 0 ? (
            <p className={["text-sm text-center mt-8", isLight ? "text-gray-400" : "text-gray-500"].join(" ")}>
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

      {/* Right: Detail panel */}
      <div className="flex-2 min-h-0 h-full overflow-hidden">
        {selectedFile ? (
          <ImportDetail node={selectedFile} theme={theme} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <ExternalLink
                className={["h-10 w-10 mx-auto mb-3", isLight ? "text-gray-300" : "text-gray-600"].join(" ")}
              />
              <p className={["text-sm font-medium", isLight ? "text-gray-500" : "text-gray-400"].join(" ")}>
                Select a file to view its imports
              </p>
              <p className={["text-xs mt-1", isLight ? "text-gray-400" : "text-gray-500"].join(" ")}>
                {totalFiles} files · {totalImports} imports total
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
