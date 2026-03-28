"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, RefreshCw } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { getSubFilesByFileId, type SubFileEntry } from "@/app/ui/doc/action";

interface SubFileListProps {
  fileId: string;
  onSelectSubFile?: (entry: SubFileEntry) => void;
  reloadKey?: number;
}

export default function SubFileList({ fileId, onSelectSubFile, reloadKey }: SubFileListProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [entries, setEntries] = useState<SubFileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!fileId?.trim()) {
      setEntries([]);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const data = await getSubFilesByFileId(fileId);
      setEntries(data);
    } catch (err) {
      console.error("Failed to load sub-files:", err);
      setError("Failed to load sub-files.");
    } finally {
      setIsLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const iconColor = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Sub Files
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={isLoading}
          className={[
            "flex h-6 w-6 items-center justify-center rounded transition-colors",
            isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-200 text-gray-500",
            isLoading ? "opacity-50 cursor-wait" : "cursor-pointer",
          ].join(" ")}
          aria-label="Refresh sub-files"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mt-2 space-y-1">
        {isLoading && entries.length === 0 ? (
          <div className="flex items-center gap-2 py-3 text-xs text-gray-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <div className="py-2 text-xs text-red-500">{error}</div>
        ) : entries.length === 0 ? (
          <div className={`py-2 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            No sub-files linked to this file.
          </div>
        ) : (
          entries.map((entry) => (
            <button
              key={entry.subFileId}
              type="button"
                onClick={() => onSelectSubFile?.(entry)}
              className={[
                "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors",
                isDark
                  ? "hover:bg-gray-800 text-gray-200"
                  : "hover:bg-gray-100 text-gray-700",
                onSelectSubFile ? "cursor-pointer" : "cursor-default",
              ].join(" ")}
            >
              <FileText className={`h-4 w-4 shrink-0 ${iconColor}`} />
              <span className="truncate flex-1">{entry.fileName ?? "Untitled"}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
