"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@/app/lib/components/ThemeProvider";
import { Code, Plus } from "lucide-react";
import { getAllCodebases, deleteCodebase, createCodebase } from "./action";
import type { CodebaseRow } from "@/app/lib/db/repository/codebase";
import { useSnackbar } from "@/app/lib/components/Snackbar";
import type { SortField, SortDir } from "./types";
import { getThemeStyles } from "./types";
import CodebaseCard from "@/app/lib/components/CodebaseCard";
import CodebaseToolbar from "@/app/lib/components/CodebaseToolbar";
import CodebaseEmptyState from "@/app/lib/components/CodebaseEmptyState";
import CodebaseDetailModal from "@/app/lib/components/CodebaseDetailModal";
import DeleteConfirmModal from "@/app/lib/components/DeleteConfirmModal";
import AddCodebaseModal from "@/app/lib/components/AddCodebaseModal";

export default function CodebasePage() {
  const { theme } = useTheme();
  const { showSnackbar } = useSnackbar();
  const isDark = theme === "dark";
  const styles = getThemeStyles(isDark);

  const [codebases, setCodebases] = useState<CodebaseRow[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [detailItem, setDetailItem] = useState<CodebaseRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CodebaseRow | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addImportPath, setAddImportPath] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCodebases();
    setIsAnimating(false);
  }, []);

  const loadCodebases = async () => {
    const result = await getAllCodebases();
    if (result.success && result.data) {
      setCodebases(result.data);
    }
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
    setAddName("");
    setAddDescription("");
    setAddImportPath("");
  };

  const handleCreate = async () => {
    if (!addName.trim() || !addImportPath.trim()) return;
    setIsSaving(true);
    const result = await createCodebase({
      name: addName.trim(),
      description: addDescription.trim() || undefined,
      importFilePath: addImportPath.trim(),
    });
    if (result.success) {
      showSnackbar({ message: "Codebase created successfully", variant: "success" });
      closeAddModal();
      await loadCodebases();
    } else {
      showSnackbar({ message: result.error || "Failed to create codebase", variant: "error" });
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteCodebase(deleteTarget.id);
    if (result.success) {
      showSnackbar({ message: "Codebase deleted successfully", variant: "success" });
      await loadCodebases();
    } else {
      showSnackbar({ message: "Failed to delete codebase", variant: "error" });
    }
    setDeleteTarget(null);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = codebases;

    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description ?? "").toLowerCase().includes(q) ||
          c.importFilePath.toLowerCase().includes(q),
      );
    }

    return [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "name") return a.name.localeCompare(b.name) * dir;
      const aVal = (a[sortField] as number) ?? 0;
      const bVal = (b[sortField] as number) ?? 0;
      return (aVal - bVal) * dir;
    });
  }, [codebases, search, sortField, sortDir]);

  return (
    <div className="flex-1 overflow-y-auto w-screen">
      <div
        className="mx-auto max-w-6xl p-8"
        style={{
          opacity: isAnimating ? 0 : 1,
          transform: isAnimating ? "translateY(20px)" : "translateY(0)",
          transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
        }}
      >
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Code className="h-6 w-6" />
              <h1 className="text-3xl font-bold">Codebase</h1>
            </div>
            <p className={styles.mutedText}>
              Browse and manage your imported codebases.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add Codebase
          </button>
        </div>

        <CodebaseToolbar
          search={search}
          onSearchChange={setSearch}
          sortField={sortField}
          sortDir={sortDir}
          onToggleSort={toggleSort}
          mutedText={styles.mutedText}
          inputBg={styles.inputBg}
          sortBtnBase={styles.sortBtnBase}
          sortBtnActive={styles.sortBtnActive}
        />

        {filtered.length === 0 ? (
          <CodebaseEmptyState isDark={isDark} hasSearch={!!search} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((codebase) => (
              <CodebaseCard
                key={codebase.id}
                codebase={codebase}
                isDark={isDark}
                cardBg={styles.cardBg}
                cardHover={styles.cardHover}
                mutedText={styles.mutedText}
                pillBg={styles.pillBg}
                onView={setDetailItem}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <div className={`mt-4 text-xs ${styles.mutedText}`}>
            Showing {filtered.length} of {codebases.length} codebase{codebases.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      <CodebaseDetailModal item={detailItem} isDark={isDark} onClose={() => setDetailItem(null)} />

      <DeleteConfirmModal
        target={deleteTarget}
        isDark={isDark}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <AddCodebaseModal
        isOpen={addModalOpen}
        isDark={isDark}
        name={addName}
        description={addDescription}
        importPath={addImportPath}
        isSaving={isSaving}
        onNameChange={setAddName}
        onDescriptionChange={setAddDescription}
        onImportPathChange={setAddImportPath}
        onClose={closeAddModal}
        onSave={handleCreate}
      />
    </div>
  );
}
