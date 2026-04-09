"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Library, Plus, Trash2 } from "lucide-react";
import { useTheme } from "@/app/lib/components/ThemeProvider";
import { useSnackbar } from "@/app/lib/components/Snackbar";
import Modal from "@/app/lib/components/Modal";
import TreeView from "@/app/lib/components/TreeView";
import type { TreeNode, TreeViewGroup } from "@/app/lib/components/@types/treeViewTypes";
import type { RagTransactionRow } from "@/app/lib/db/repository/rag-transaction";
import { formatDate, getThemeStyles } from "@/app/ui/codebase/types";
import {
  createRagTransaction,
  deleteRagTransaction,
  getAllRagTransactions,
  getRagPickerTreeData,
} from "./action";

/** Must match `join` when saving multiple files in `handleCreate`. */
const RAG_COLLECTION_FILE_DELIMITER = "; ";

function CollectionFileLineIcon() {
  return (
    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden />
  );
}

function renderRagCollectionColumn(value: string | null | undefined) {
  if (!value?.trim()) return "—";
  const parts = value.split(RAG_COLLECTION_FILE_DELIMITER).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) {
    return (
      <span className="inline-flex items-start gap-2">
        <CollectionFileLineIcon />
        <span className="min-w-0 wrap-break-word">{parts[0]}</span>
      </span>
    );
  }
  return (
    <ul className="m-0 max-w-md list-none space-y-1.5 py-0 pl-0">
      {parts.map((line, i) => (
        <li key={i} className="flex items-start gap-2 leading-snug">
          <CollectionFileLineIcon />
          <span className="min-w-0 wrap-break-word">{line}</span>
        </li>
      ))}
    </ul>
  );
}

export default function RagPage() {
  const { theme } = useTheme();
  const { showSnackbar } = useSnackbar();
  const isDark = theme === "dark";
  const styles = getThemeStyles(isDark);

  const [rows, setRows] = useState<RagTransactionRow[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addStep, setAddStep] = useState<1 | 2>(1);
  const [ragName, setRagName] = useState("");
  const [pickerGroups, setPickerGroups] = useState<TreeViewGroup[]>([]);
  const [pickerSubFileIds, setPickerSubFileIds] = useState<Set<string>>(new Set());
  const [pickerLoading, setPickerLoading] = useState(false);
  /** Selected .md files by file id → display label (collection › path). */
  const [pickedMarkdownFiles, setPickedMarkdownFiles] = useState<Map<string, { label: string }>>(() => new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RagTransactionRow | null>(null);
  /** After first fetch, animate main content in (fade + slide). */
  const [contentRevealed, setContentRevealed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getAllRagTransactions();
      if (cancelled) return;
      if (result.success && result.data) {
        setRows(result.data);
      } else {
        showSnackbar({ message: result.error ?? "Failed to load RAG records", variant: "error" });
      }
      if (cancelled) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setContentRevealed(true);
        });
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [showSnackbar]);

  const refreshRows = async () => {
    const result = await getAllRagTransactions();
    if (result.success && result.data) {
      setRows(result.data);
    }
  };

  const resetAddModal = () => {
    setAddOpen(false);
    setAddStep(1);
    setRagName("");
    setPickerGroups([]);
    setPickerSubFileIds(new Set());
    setPickedMarkdownFiles(new Map());
    setPickerLoading(false);
  };

  const closeAdd = () => {
    if (isSaving) return;
    resetAddModal();
  };

  const goToStep2 = async () => {
    if (!ragName.trim()) {
      showSnackbar({ message: "RAG name is required", variant: "error" });
      return;
    }
    setPickerLoading(true);
    setPickedMarkdownFiles(new Map());
    const result = await getRagPickerTreeData();
    setPickerLoading(false);
    if (!result.success || !result.data) {
      showSnackbar({ message: result.error ?? "Failed to load collections", variant: "error" });
      return;
    }
    setPickerGroups(result.data.groups);
    setPickerSubFileIds(new Set(result.data.subFileContentIds));
    setAddStep(2);
  };

  const toggleMarkdownPick = useCallback(
    (fileId: string, node: TreeNode, nodePath: string, checked: boolean) => {
      setPickedMarkdownFiles((prev) => {
        const next = new Map(prev);
        if (checked) {
          const group = pickerGroups.find((g) => g.id === node.collectionId);
          const collectionName = group?.name ?? "Collection";
          next.set(fileId, { label: `${collectionName} › ${nodePath}` });
        } else {
          next.delete(fileId);
        }
        return next;
      });
    },
    [pickerGroups],
  );

  const handleCreate = async () => {
    if (!ragName.trim() || pickedMarkdownFiles.size === 0) {
      showSnackbar({ message: "Enter a RAG name and select at least one .md file", variant: "error" });
      return;
    }
    const collection = [...pickedMarkdownFiles.values()]
      .map((v) => v.label)
      .join(RAG_COLLECTION_FILE_DELIMITER);
    setIsSaving(true);
    const result = await createRagTransaction({
      ragName: ragName.trim(),
      collection,
    });
    setIsSaving(false);
    if (result.success) {
      showSnackbar({ message: "RAG record added", variant: "success" });
      resetAddModal();
      await refreshRows();
    } else {
      showSnackbar({ message: result.error ?? "Failed to add record", variant: "error" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteRagTransaction(deleteTarget.id);
    if (result.success) {
      showSnackbar({ message: "RAG record deleted", variant: "success" });
      await refreshRows();
    } else {
      showSnackbar({ message: result.error ?? "Failed to delete", variant: "error" });
    }
    setDeleteTarget(null);
  };

  const tableBorder = isDark ? "border-gray-800" : "border-gray-200";
  const headerBg = isDark ? "bg-gray-900/80" : "bg-gray-50";
  const rowHover = isDark ? "hover:bg-gray-900/50" : "hover:bg-gray-50";

  return (
    <div className="flex-1 overflow-y-auto w-screen">
      <div
        className="mx-auto max-w-6xl p-8"
        style={{
          opacity: contentRevealed ? 1 : 0,
          transform: contentRevealed ? "translateY(0)" : "translateY(18px)",
          transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
        }}
      >
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <Library className="h-6 w-6" />
              <h1 className="text-3xl font-bold">RAG</h1>
            </div>
            <p className={styles.mutedText}>Collect and manage RAG transactions.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setAddOpen(true);
              setAddStep(1);
              setPickedMarkdownFiles(new Map());
              setPickerGroups([]);
            }}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4" />
            Add RAG
          </button>
        </div>

        <div className={`overflow-hidden rounded-lg border ${tableBorder} ${isDark ? "bg-gray-950" : "bg-white"}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className={`border-b ${tableBorder} ${headerBg}`}>
                  <th className="px-4 py-3 font-semibold">RAG name</th>
                  <th className="px-4 py-3 font-semibold">Collection / file</th>
                  <th className="px-4 py-3 font-semibold">Update date</th>
                  <th className="px-4 py-3 font-semibold">Updated by</th>
                  <th className="w-28 px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={`px-4 py-10 text-center ${styles.mutedText}`}>
                      No RAG records yet. Add one to get started.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className={`border-b ${tableBorder} ${rowHover}`}>
                      <td className="px-4 py-3 font-medium">{row.ragName}</td>
                      <td className={`px-4 py-3 ${styles.mutedText} max-w-md align-top`}>
                        {renderRagCollectionColumn(row.collection)}
                      </td>
                      <td className={`px-4 py-3 ${styles.mutedText}`}>{formatDate(row.updatedAt)}</td>
                      <td className={`px-4 py-3 ${styles.mutedText}`}>{row.updatedBy}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(row)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
                          aria-label={`Delete ${row.ragName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {rows.length > 0 && (
          <p className={`mt-3 text-xs ${styles.mutedText}`}>
            {rows.length} record{rows.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <Modal isOpen={addOpen} onClose={closeAdd} size={addStep === 1 ? "sm" : "lg"}>
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            {addStep === 1 ? (
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center h-10 w-10 rounded-lg ${isDark ? "bg-blue-950 text-blue-400" : "bg-blue-50 text-blue-600"
                    }`}
                >
                  <Plus className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold">Add RAG</h2>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center h-10 w-10 rounded-lg ${isDark ? "bg-blue-950 text-blue-400" : "bg-blue-50 text-blue-600"
                    }`}
                >
                  <FileText className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold">Select Markdown files</h2>
              </div>
            )}
          </h2>

          {addStep === 1 && (
            <>
              <div className="space-y-3">
                <label className="block">
                  <span className={`mb-1 block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Name <span className="text-red-500">*</span>
                  </span>
                  <input
                    value={ragName}
                    onChange={(e) => setRagName(e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${styles.inputBg}`}
                    placeholder="e.g. product-docs"
                    autoComplete="off"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAdd}
                  disabled={pickerLoading}
                  className={`rounded-lg px-4 py-2 font-medium transition-colors ${isDark ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void goToStep2()}
                  disabled={pickerLoading}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {pickerLoading ? "Loading…" : "Next"}
                </button>
              </div>
            </>
          )}

          {addStep === 2 && (
            <>
              <p className={`text-sm ${styles.mutedText}`}>
                RAG: <span className="font-medium text-inherit">{ragName.trim()}</span> — use the checkboxes to select one or more{" "}
                <code className="text-xs">.md</code> files (row click also toggles).
              </p>
              <div
                className={`max-h-[min(360px,50vh)] overflow-y-auto rounded-lg border ${tableBorder} ${isDark ? "bg-gray-900/40" : "bg-gray-50/80"
                  }`}
              >
                {pickerLoading ? (
                  <p className={`p-4 text-sm ${styles.mutedText}`}>Loading collections…</p>
                ) : pickerGroups.length === 0 ? (
                  <p className={`p-4 text-sm ${styles.mutedText}`}>No collections found. Create one in Docs first.</p>
                ) : (
                  <>
                    {/* Picker: readOnlyTree hides add-file / folder / Azure toolbar and deletes; Docs sidebar omits this. */}
                    <TreeView
                      data={pickerGroups}
                      readOnlyTree
                      subFileContentIds={pickerSubFileIds}
                      markdownPickerMulti={{
                        selectedByFileId: pickedMarkdownFiles,
                        onToggle: toggleMarkdownPick,
                      }}
                    />
                  </>
                )}
              </div>
              <div className={`text-sm ${pickedMarkdownFiles.size > 0 ? "text-blue-600 dark:text-blue-400" : styles.mutedText}`}>
                {pickedMarkdownFiles.size === 0 ? (
                  "No files selected yet."
                ) : (
                  <>
                    <span className="font-medium">{pickedMarkdownFiles.size} file{pickedMarkdownFiles.size !== 1 ? "s" : ""} selected:</span>
                    <ul className="mt-1 max-h-28 list-disc space-y-0.5 overflow-y-auto pl-5 text-left">
                      {[...pickedMarkdownFiles.entries()].map(([id, v]) => (
                        <li key={id} className="truncate" title={v.label}>
                          {v.label}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddStep(1);
                    setPickedMarkdownFiles(new Map());
                  }}
                  disabled={isSaving}
                  className={`rounded-lg px-4 py-2 font-medium transition-colors ${isDark ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={isSaving || pickedMarkdownFiles.size === 0}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Delete RAG record</h2>
          <p className={isDark ? "text-gray-400" : "text-gray-600"}>
            Delete <span className="font-medium">{deleteTarget?.ragName}</span>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${isDark ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
