"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import Modal from "./Modal";
import { deleteSubFile, getSubFilesByFileId, type SubFileEntry } from "@/app/ui/doc/action";

interface SubFileListProps {
  fileId: string;
  onSelectSubFile?: (entry: SubFileEntry) => void;
  onRemoveSubFile?: () => void;
  reloadKey?: number;
}

export default function SubFileList({ fileId, onSelectSubFile, onRemoveSubFile, reloadKey }: SubFileListProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [entries, setEntries] = useState<SubFileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<SubFileEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleConfirmRemove = useCallback(async () => {
    if (!confirmTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteSubFile(confirmTarget.subFileId);
      setEntries((prev) => prev.filter((e) => e.subFileId !== confirmTarget.subFileId));
      setConfirmTarget(null);
      onRemoveSubFile?.();
    } catch (err) {
      console.error("Failed to remove sub-file:", err);
    } finally {
      setIsDeleting(false);
    }
  }, [confirmTarget, isDeleting, onRemoveSubFile]);

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
            <div key={entry.subFileId} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelectSubFile?.(entry)}
                className={[
                  "flex-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors",
                  isDark
                    ? "hover:bg-gray-800 text-gray-200"
                    : "hover:bg-gray-100 text-gray-700",
                  onSelectSubFile ? "cursor-pointer" : "cursor-default",
                ].join(" ")}
              >
                <FileText className={`h-4 w-4 shrink-0 ${iconColor}`} />
                <span className="truncate flex-1">{entry.fileName ?? "Untitled"}</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmTarget(entry)}
                className={[
                  "flex h-6 w-6 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity",
                  isDark
                    ? "hover:bg-red-900/40 text-gray-400 hover:text-red-400"
                    : "hover:bg-red-100 text-gray-400 hover:text-red-500",
                ].join(" ")}
                aria-label={`Remove ${entry.fileName ?? "sub-file"}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={!!confirmTarget} onClose={() => { if (!isDeleting) setConfirmTarget(null); }}>
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${isDark ? "text-gray-100" : "text-gray-900"}`}>
            Remove Sub File
          </h3>
          <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            This will permanently remove{" "}
            <span className="font-semibold">
              &quot;{confirmTarget?.fileName ?? "Untitled"}&quot;
            </span>
            . This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setConfirmTarget(null)}
              disabled={isDeleting}
              className={[
                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                isDark
                  ? "text-gray-300 bg-gray-700 hover:bg-gray-600"
                  : "text-gray-700 bg-gray-100 hover:bg-gray-200",
                "disabled:opacity-70",
              ].join(" ")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmRemove()}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-2"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
