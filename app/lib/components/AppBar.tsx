"use client";
/**
 * @file AppBar.tsx
 * @description Top navigation bar component displaying logo, app title, Cmd+K file search palette, and a theme toggle button.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";
import Logo from "./Logo";
import ThemeToggleIcon from "./ThemeToggleIcon";
import { findAllCollections } from "@/app/ui/doc/action";
import type { TreeNode, TreeViewGroup } from "./@types/treeViewTypes";
import { useDocWorkspaceStore } from "@/app/lib/stores/docWorkspaceStore";

interface FlatFile {
  node: TreeNode;
  path: string;
  collectionName: string;
}

function flattenFiles(
  nodes: TreeNode[],
  parentPath: string,
  collectionName: string,
  acc: FlatFile[],
) {
  for (const node of nodes) {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    if (node.type === "file") {
      acc.push({ node, path: currentPath, collectionName });
    }
    if (node.type === "folder" && node.children?.length) {
      flattenFiles(node.children, currentPath, collectionName, acc);
    }
  }
}

function parseDirectories(raw: unknown): TreeNode[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as TreeNode[];
  if (typeof raw === "string") {
    try {
      const once = JSON.parse(raw) as unknown;
      if (Array.isArray(once)) return once as TreeNode[];
      if (typeof once === "string") {
        try {
          const twice = JSON.parse(once) as unknown;
          return Array.isArray(twice) ? (twice as TreeNode[]) : [];
        } catch {
          return [];
        }
      }
      return [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function AppBar() {
  const { theme, toggleTheme } = useTheme();
  const selectFile = useDocWorkspaceStore((s) => s.selectFile);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [allFiles, setAllFiles] = useState<FlatFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const collections = await findAllCollections();
      const groups: TreeViewGroup[] = collections.map((c) => ({
        id: c.id,
        name: c.name ?? "",
        directories: parseDirectories(c.directories),
      }));
      const files: FlatFile[] = [];
      for (const group of groups) {
        flattenFiles(group.directories, "", group.name, files);
      }
      setAllFiles(files);
    } catch (err) {
      console.error("Failed to load files for search:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setHighlightIndex(0);
    void loadFiles();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [loadFiles]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setHighlightIndex(0);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, open, close]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allFiles;
    return allFiles.filter(
      (f) =>
        f.node.name.toLowerCase().includes(q) ||
        f.path.toLowerCase().includes(q),
    );
  }, [query, allFiles]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const highlighted = listRef.current?.children[highlightIndex] as HTMLElement | undefined;
    highlighted?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, isOpen]);

  const handleSelect = useCallback(
    (file: FlatFile) => {
      void selectFile(file.node, file.path);
      close();
    },
    [selectFile, close],
  );

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlightIndex]) {
        handleSelect(filtered[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  const extensionIcon = (name: string) => {
    if (name.endsWith(".flow")) return "⚡";
    if (name.endsWith(".datatable")) return "📊";
    return "📄";
  };

  return (
    <>
      <header
        className={[
          "sticky top-0 z-50 w-full border-b backdrop-blur-sm",
          theme === "light"
            ? "border-gray-200 bg-white/80"
            : "border-gray-800 bg-gray-900/80",
        ].join(" ")}
      >
        <div className="mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Logo />
            <h1
              className={[
                "text-xl font-semibold",
                theme === "light" ? "text-gray-900" : "text-gray-100",
              ].join(" ")}
            >
              Synapse
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={open}
              className={[
                "relative flex h-9 w-56 items-center gap-2 rounded-lg border pl-9 pr-14 text-sm transition-colors cursor-pointer",
                theme === "light"
                  ? "border-gray-200 bg-gray-100 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                  : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:bg-gray-700",
              ].join(" ")}
            >
              <svg
                className={[
                  "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
                  theme === "light" ? "text-gray-400" : "text-gray-500",
                ].join(" ")}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              <span>Search docs...</span>
              <kbd
                className={[
                  "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border px-1.5 py-0.5 text-xs font-medium",
                  theme === "light"
                    ? "border-gray-300 bg-white text-gray-500"
                    : "border-gray-600 bg-gray-700 text-gray-400",
                ].join(" ")}
              >
                ⌘K
              </kbd>
            </button>

            <button
              onClick={toggleTheme}
              className={[
                "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-800",
              ].join(" ")}
              aria-label="Toggle theme"
            >
              <ThemeToggleIcon theme={theme} />
            </button>
          </div>
        </div>
      </header>

      {isOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-100 flex items-start justify-center pt-[15vh]"
          onClick={(e) => {
            if (e.target === overlayRef.current) close();
          }}
        >
          <div className="fixed inset-0 bg-black/40" />
          <div
            className={[
              "relative z-10 w-full max-w-lg rounded-xl border shadow-2xl",
              theme === "light"
                ? "border-gray-200 bg-white"
                : "border-gray-700 bg-gray-900",
            ].join(" ")}
          >
            <div
              className={[
                "flex items-center gap-3 border-b px-4 py-3",
                theme === "light" ? "border-gray-200" : "border-gray-700",
              ].join(" ")}
            >
              <svg
                className={[
                  "h-5 w-5 shrink-0",
                  theme === "light" ? "text-gray-400" : "text-gray-500",
                ].join(" ")}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search files..."
                className={[
                  "flex-1 bg-transparent text-sm outline-none",
                  theme === "light"
                    ? "text-gray-900 placeholder:text-gray-400"
                    : "text-gray-100 placeholder:text-gray-500",
                ].join(" ")}
              />
              <kbd
                className={[
                  "shrink-0 rounded border px-1.5 py-0.5 text-xs font-medium",
                  theme === "light"
                    ? "border-gray-300 bg-gray-100 text-gray-500"
                    : "border-gray-600 bg-gray-800 text-gray-400",
                ].join(" ")}
              >
                ESC
              </kbd>
            </div>

            <div
              ref={listRef}
              className="max-h-72 overflow-y-auto px-2 py-2"
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div
                    className={[
                      "h-5 w-5 animate-spin rounded-full border-2 border-t-transparent",
                      theme === "light" ? "border-gray-400" : "border-gray-500",
                    ].join(" ")}
                  />
                </div>
              ) : filtered.length === 0 ? (
                <div
                  className={[
                    "py-8 text-center text-sm",
                    theme === "light" ? "text-gray-500" : "text-gray-400",
                  ].join(" ")}
                >
                  {query ? "No files found." : "No files available."}
                </div>
              ) : (
                filtered.map((file, idx) => (
                  <button
                    key={`${file.node.id}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(file)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={[
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      idx === highlightIndex
                        ? theme === "light"
                          ? "bg-blue-50 text-gray-900"
                          : "bg-gray-800 text-gray-100"
                        : theme === "light"
                          ? "text-gray-700 hover:bg-gray-50"
                          : "text-gray-300 hover:bg-gray-800/60",
                    ].join(" ")}
                  >
                    <span className="shrink-0 text-base leading-none">
                      {extensionIcon(file.node.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {file.node.name}
                      </div>
                      <div
                        className={[
                          "truncate text-xs",
                          theme === "light" ? "text-gray-400" : "text-gray-500",
                        ].join(" ")}
                      >
                        {file.collectionName} / {file.path}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {!isLoading && filtered.length > 0 && (
              <div
                className={[
                  "flex items-center gap-4 border-t px-4 py-2 text-xs",
                  theme === "light"
                    ? "border-gray-200 text-gray-400"
                    : "border-gray-700 text-gray-500",
                ].join(" ")}
              >
                <span className="flex items-center gap-1">
                  <kbd
                    className={[
                      "rounded border px-1 py-0.5 text-[10px] font-medium",
                      theme === "light"
                        ? "border-gray-300 bg-gray-100"
                        : "border-gray-600 bg-gray-800",
                    ].join(" ")}
                  >
                    ↑↓
                  </kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd
                    className={[
                      "rounded border px-1 py-0.5 text-[10px] font-medium",
                      theme === "light"
                        ? "border-gray-300 bg-gray-100"
                        : "border-gray-600 bg-gray-800",
                    ].join(" ")}
                  >
                    ↵
                  </kbd>
                  open
                </span>
                <span className="flex items-center gap-1">
                  <kbd
                    className={[
                      "rounded border px-1 py-0.5 text-[10px] font-medium",
                      theme === "light"
                        ? "border-gray-300 bg-gray-100"
                        : "border-gray-600 bg-gray-800",
                    ].join(" ")}
                  >
                    esc
                  </kbd>
                  close
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
