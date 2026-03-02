import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link2,
  List,
  Maximize2,
  Minimize2,
  Network,
  Package,
} from "lucide-react";

import { getFileIcon } from "./helpers";
import { ImportDependencyGraph } from "./ImportDependencyGraph";
import type { FileNode } from "./types";

interface ImportDetailProps {
  node: FileNode;
  theme: string;
}

export function ImportDetail({ node, theme }: ImportDetailProps) {
  const isLight = theme === "light";
  const [filter, setFilter] = useState<"all" | "external" | "internal">("all");
  const [view, setView] = useState<"list" | "graph">("list");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const fullscreenTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    console.log("node", node);
  }, [node])

  const openFullscreen = useCallback(() => {
    if (fullscreenTimeout.current) clearTimeout(fullscreenTimeout.current);
    setIsFullscreen(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setFullscreenVisible(true))
    );
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreenVisible(false);
    fullscreenTimeout.current = setTimeout(() => setIsFullscreen(false), 300);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFullscreen();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFullscreen, closeFullscreen]);

  useEffect(() => {
    return () => {
      if (fullscreenTimeout.current) clearTimeout(fullscreenTimeout.current);
    };
  }, []);

  const filtered = node.entry.imports.filter((imp) => {
    if (filter === "external") return imp.is_external;
    if (filter === "internal") return !imp.is_external;
    return true;
  });

  const externalCount = node.entry.imports.filter((entry) => entry.is_external).length;
  const internalCount = node.entry.imports.filter((entry) => !entry.is_external).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={[
          "shrink-0 border-b px-4 py-3",
          isLight ? "border-gray-200" : "border-gray-700",
        ].join(" ")}
      >
        <div className="mb-1 flex items-center gap-2">
          {getFileIcon(node.name, "h-4 w-4 text-sky-400")}
          <span className="truncate text-sm font-semibold">{node.name}</span>
        </div>
        <div
          className={[
            "mb-3 truncate text-xs",
            isLight ? "text-gray-400" : "text-gray-500",
          ].join(" ")}
        >
          {node.fullPath}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-1 flex-wrap gap-1">
            {(["all", "external", "internal"] as const).map((currentFilter) => {
              const count =
                currentFilter === "all"
                  ? node.entry.imports.length
                  : currentFilter === "external"
                    ? externalCount
                    : internalCount;
              return (
                <button
                  key={currentFilter}
                  onClick={() => setFilter(currentFilter)}
                  className={[
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    filter === currentFilter
                      ? isLight
                        ? "bg-gray-800 text-white"
                        : "bg-gray-100 text-gray-900"
                      : isLight
                        ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700",
                  ].join(" ")}
                >
                  {currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div
              className={[
                "flex overflow-hidden rounded-lg border",
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

            <div
              className="flex items-center overflow-hidden"
              style={{
                width: view === "graph" ? 32 : 0,
                opacity: view === "graph" ? 1 : 0,
                transition:
                  "width 250ms cubic-bezier(0.4,0,0.2,1), opacity 200ms ease",
              }}
            >
              <button
                onClick={openFullscreen}
                title="Fullscreen"
                className={[
                  "shrink-0 rounded-lg border p-1.5 transition-colors",
                  isLight
                    ? "border-gray-200 text-gray-500 hover:bg-gray-100"
                    : "border-gray-700 text-gray-400 hover:bg-gray-800",
                ].join(" ")}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {view === "list" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3">
          {filtered.length === 0 ? (
            <p
              className={[
                "mt-8 text-center text-sm",
                isLight ? "text-gray-400" : "text-gray-500",
              ].join(" ")}
            >
              No imports found.
            </p>
          ) : (
            filtered.map((imp, index) => (
              <div
                key={index}
                className={[
                  "rounded-lg border p-3",
                  isLight
                    ? "border-gray-200 bg-gray-50"
                    : "border-gray-700 bg-gray-800/50",
                ].join(" ")}
              >
                <div className="mb-2 flex items-center gap-1.5">
                  {imp.is_external ? (
                    <Package className="h-3.5 w-3.5 shrink-0 text-purple-400" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
                  )}
                  <span
                    className={[
                      "truncate text-xs font-mono font-medium",
                      imp.is_external
                        ? isLight
                          ? "text-purple-700"
                          : "text-purple-300"
                        : isLight
                          ? "text-green-700"
                          : "text-green-300",
                    ].join(" ")}
                  >
                    {imp.from}
                  </span>
                  <span
                    className={[
                      "ml-auto shrink-0 rounded px-1.5 py-0.5 text-xs",
                      imp.is_external
                        ? isLight
                          ? "bg-purple-100 text-purple-700"
                          : "bg-purple-900/40 text-purple-300"
                        : isLight
                          ? "bg-green-100 text-green-700"
                          : "bg-green-900/40 text-green-300",
                    ].join(" ")}
                  >
                    {imp.is_external ? "external" : "internal"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {imp.items.map((item, itemIndex) => (
                    <span
                      key={itemIndex}
                      className={[
                        "rounded px-1.5 py-0.5 font-mono text-xs",
                        isLight ? "bg-gray-200 text-gray-700" : "bg-gray-700 text-gray-300",
                      ].join(" ")}
                    >
                      {item}
                    </span>
                  ))}
                </div>

                {!imp.is_external && imp.from_path && (
                  <div
                    className={[
                      "mt-1.5 truncate text-xs",
                      isLight ? "text-gray-400" : "text-gray-500",
                    ].join(" ")}
                  >
                    {imp.from_path}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <ImportDependencyGraph
            key={`${node.fullPath}::${filter}`}
            imports={filtered}
            fileName={node.name}
            theme={theme}
          />
        </div>
      )}

      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{
            background: isLight ? "#ffffff" : "#0f1117",
            opacity: fullscreenVisible ? 1 : 0,
            transform: fullscreenVisible ? "scale(1)" : "scale(0.97)",
            transition:
              "opacity 300ms cubic-bezier(0.4,0,0.2,1), transform 300ms cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <div
            className={[
              "flex shrink-0 items-center justify-between border-b px-4 py-3",
              isLight ? "border-gray-200 bg-white" : "border-gray-700 bg-gray-900",
            ].join(" ")}
            style={{
              opacity: fullscreenVisible ? 1 : 0,
              transform: fullscreenVisible ? "translateY(0)" : "translateY(-8px)",
              transition: "opacity 300ms 50ms ease, transform 300ms 50ms ease",
            }}
          >
            <div className="flex min-w-0 items-center gap-2">
              {getFileIcon(node.name, "h-4 w-4 shrink-0 text-sky-400")}
              <span className="truncate text-sm font-semibold">{node.name}</span>
              <span
                className={[
                  "truncate text-xs",
                  isLight ? "text-gray-400" : "text-gray-500",
                ].join(" ")}
              >
                — {node.fullPath}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex gap-1">
                {(["all", "external", "internal"] as const).map((currentFilter) => {
                  const count =
                    currentFilter === "all"
                      ? node.entry.imports.length
                      : currentFilter === "external"
                        ? externalCount
                        : internalCount;
                  return (
                    <button
                      key={currentFilter}
                      onClick={() => setFilter(currentFilter)}
                      className={[
                        "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                        filter === currentFilter
                          ? isLight
                            ? "bg-gray-800 text-white"
                            : "bg-gray-100 text-gray-900"
                          : isLight
                            ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700",
                      ].join(" ")}
                    >
                      {currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)} ({count})
                    </button>
                  );
                })}
              </div>
              <button
                onClick={closeFullscreen}
                title="Exit fullscreen"
                className={[
                  "rounded-lg border p-1.5 transition-colors",
                  isLight
                    ? "border-gray-200 text-gray-500 hover:bg-gray-100"
                    : "border-gray-700 text-gray-400 hover:bg-gray-800",
                ].join(" ")}
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div
            className="min-h-0 flex-1"
            style={{
              opacity: fullscreenVisible ? 1 : 0,
              transform: fullscreenVisible ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 350ms 100ms ease, transform 350ms 100ms ease",
            }}
          >
            <ImportDependencyGraph
              key={`fs-${node.fullPath}::${filter}`}
              imports={filtered}
              fileName={node.name}
              theme={theme}
            />
          </div>
        </div>
      )}
    </div>
  );
}
