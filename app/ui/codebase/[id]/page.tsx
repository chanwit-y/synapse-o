"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@/app/lib/components/ThemeProvider";
import { ArrowLeft, Code, FolderOpen, Calendar, Loader2, PanelRightOpen, Bot } from "lucide-react";
import { getCodebaseById, getImportPathData } from "../action";
import { formatDate } from "../types";
import type { CodebaseRow } from "@/app/lib/db/repository/codebase";
import type { ImportPathEntry } from "@/app/lib/components/ImportPathTreeView";
import ImportPathTreeView from "@/app/lib/components/ImportPathTreeView";
import Drawer from "@/app/lib/components/Drawer";
import Modal from "@/app/lib/components/Modal";

export default function CodebaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [codebase, setCodebase] = useState<CodebaseRow | null>(null);
  const [importData, setImportData] = useState<ImportPathEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    (async () => {
      setLoading(true);
      setError(null);

      const cbResult = await getCodebaseById(id);
      if (!cbResult.success || !cbResult.data) {
        setError(cbResult.error ?? "Codebase not found");
        setLoading(false);
        return;
      }

      setCodebase(cbResult.data);

      const ipResult = await getImportPathData(cbResult.data.importFilePath);
      if (ipResult.success && ipResult.data) {
        setImportData(ipResult.data);
      } else {
        setError(ipResult.error ?? "Failed to load import data");
      }

      setLoading(false);
    })();
  }, [id]);

  const mutedText = isDark ? "text-gray-400" : "text-gray-500";
  const borderColor = isDark ? "border-gray-700" : "border-gray-200";
  const cardBg = isDark ? "bg-gray-900" : "bg-white";

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className={`h-8 w-8 animate-spin ${mutedText}`} />
      </div>
    );
  }

  if (error && !codebase) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className={`text-sm ${mutedText}`}>{error}</p>
        <button
          type="button"
          onClick={() => router.push("/ui/codebase")}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Codebases
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex w-screen flex-col overflow-hidden">
      {/* Header */}
      <div className={`shrink-0 border-b px-6 py-4 ${borderColor}`}>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/ui/codebase")}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"
            }`}
            title="Back to Codebases"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div
            className={`flex items-center justify-center h-10 w-10 rounded-lg ${
              isDark ? "bg-blue-950 text-blue-400" : "bg-blue-50 text-blue-600"
            }`}
          >
            <Code className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold truncate">{codebase?.name}</h1>
            <p className={`text-sm truncate ${mutedText}`}>
              {codebase?.description || "No description"}
            </p>
          </div>

          <div className={`flex items-center gap-4 text-xs shrink-0 ${mutedText}`}>
            <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
              <FolderOpen className="h-3.5 w-3.5 opacity-60" />
              <span className="truncate max-w-48" title={codebase?.importFilePath}>
                {codebase?.importFilePath}
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(codebase?.createdAt)}
            </span>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className={[
                "flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer",
                isDark
                  ? "text-gray-300 hover:bg-gray-800"
                  : "text-gray-600 hover:bg-gray-100",
              ].join(" ")}
              aria-label="Open codebase modal"
              title="Open modal"
            >
              <Bot className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className={[
                "flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer",
                isDark
                  ? "text-gray-300 hover:bg-gray-800"
                  : "text-gray-600 hover:bg-gray-100",
              ].join(" ")}
              aria-label="Open codebase details drawer"
              title="Open details"
            >
              <PanelRightOpen className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="md">
        <div className="space-y-4 pr-6">
          <h2 className="text-lg font-semibold">Codebase Overview</h2>
          <p className={`text-sm ${mutedText}`}>
            This is a quick modal view for the selected codebase.
          </p>
          <div className={`rounded-lg border p-3 text-sm ${borderColor} ${cardBg}`}>
            <p><span className="font-medium">Name:</span> {codebase?.name ?? "-"}</p>
            <p><span className="font-medium">Path:</span> {codebase?.importFilePath ?? "-"}</p>
            <p><span className="font-medium">Created:</span> {formatDate(codebase?.createdAt)}</p>
          </div>
        </div>
      </Modal>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        position="right"
        title="Codebase Details"
      >
        <div className="space-y-4 text-sm">
        
        </div>
      </Drawer>

      {/* Import Tree View */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {importData ? (
          <ImportPathTreeView data={importData} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className={`text-sm ${mutedText}`}>No import data available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
