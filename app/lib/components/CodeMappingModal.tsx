"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";
import Modal from "./Modal";
import { useSnackbar } from "./Snackbar";
import { getAllCodebases, getImportPathData } from "@/app/ui/codebase/action";
import type { CodebaseRow } from "@/app/lib/db/repository/codebase";
import ImportPathTreeView, { type ImportPathEntry } from "./ImportPathTreeView";
import CustomSelect from "./CustomSelect";

export interface CodeMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFilePath: string | null;
}

export default function CodeMappingModal({
  isOpen,
  onClose,
  selectedFilePath,
}: CodeMappingModalProps) {
  const { theme } = useTheme();
  const { showSnackbar } = useSnackbar();

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [importPathData, setImportPathData] = useState<ImportPathEntry[] | null>(null);
  const [isImportPathLoading, setIsImportPathLoading] = useState(false);
  const [importPathError, setImportPathError] = useState("");
  const [codebases, setCodebases] = useState<CodebaseRow[]>([]);
  const [isCodebasesLoading, setIsCodebasesLoading] = useState(false);
  const [selectedCodebaseId, setSelectedCodebaseId] = useState("");
  const [initAutomateTestPath, setInitAutomateTestPath] = useState(selectedFilePath ?? "");
  const [checkedFiles, setCheckedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    setInitAutomateTestPath(selectedFilePath ?? "");
  }, [selectedFilePath]);

  useEffect(() => {
    if (!isOpen) return;
    setImportPathError("");
    setInitAutomateTestPath(selectedFilePath ?? "");

    if (codebases.length > 0) return;

    (async () => {
      setIsCodebasesLoading(true);
      try {
        const result = await getAllCodebases();
        if (result.success && result.data) {
          setCodebases(result.data);
        } else {
          setImportPathError(result.error ?? "Failed to load codebases.");
        }
      } catch (error) {
        console.error("Failed to load codebases:", error);
        setImportPathError("Failed to load codebases.");
      } finally {
        setIsCodebasesLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleClose = () => {
    onClose();
    setIsFullScreen(false);
  };

  const handleSelectCodebase = async (codebaseId: string) => {
    setSelectedCodebaseId(codebaseId);
    setImportPathData(null);
    setImportPathError("");

    if (!codebaseId) return;

    const selected = codebases.find((c) => c.id === codebaseId);
    if (!selected) return;

    setIsImportPathLoading(true);
    try {
      const result = await getImportPathData(selected.importFilePath);
      if (result.success && result.data) {
        setImportPathData(result.data);
      } else {
        setImportPathError(result.error ?? "Failed to load import path data.");
      }
    } catch (error) {
      console.error("Failed to load import path data:", error);
      setImportPathError("Failed to load import path data.");
    } finally {
      setIsImportPathLoading(false);
    }
  };

  const handleCheckedPathsChange = useCallback((paths: Set<string>) => {
    setCheckedFiles(new Set(paths));
  }, []);

  const handleInitAutomateTest = () => {
    const targetPath = initAutomateTestPath.trim();
    const selected = codebases.find((c) => c.id === selectedCodebaseId);
    const srcPrefix = selected?.importSrcPath?.replace(/\/+$/, "") ?? "";
    const selectedFilesList = Array.from(checkedFiles).map((p) => {
      const cleaned = p.replace(/^src\//, "");
      return srcPrefix ? `${srcPrefix}/${cleaned}` : cleaned;
    });
    console.log("[Extract Code Base] selected files:", selectedFilesList);

    showSnackbar({
      variant: targetPath ? "info" : "warning",
      title: "Extract code base",
      message: targetPath
        ? `Code base extraction is ready for path: ${targetPath}`
        : "Please provide a path before extracting code base.",
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      fullScreen={isFullScreen}
      onToggleFullScreen={() => setIsFullScreen((v) => !v)}
    >
      <div className={`flex flex-col ${isFullScreen ? "h-full" : "h-[75vh]"}`}>
        <div className="shrink-0 border-b border-gray-200 pb-3 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Extract Code</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Select a codebase to browse file import relationships.
          </p>

          <div className="mt-3">
            <CustomSelect
              value={selectedCodebaseId}
              onChange={handleSelectCodebase}
              options={codebases.map((cb) => ({ value: cb.id, label: cb.name }))}
              placeholder={isCodebasesLoading ? "Loading codebases\u2026" : "Select a codebase\u2026"}
              disabled={isCodebasesLoading}
              theme={theme}
              ariaLabel="Select codebase"
            />
          </div>

          {selectedCodebaseId && (() => {
            const selected = codebases.find((c) => c.id === selectedCodebaseId);
            return selected?.importSrcPath ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate" title={selected.importSrcPath}>
                <span className="font-medium">Import src path:</span> {selected.importSrcPath}
              </p>
            ) : null;
          })()}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden pt-3">
          {!selectedCodebaseId ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Please select a codebase above to view import paths.
            </div>
          ) : isImportPathLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Loading import path data...
            </div>
          ) : importPathError ? (
            <div className="flex h-full items-center justify-center text-sm text-red-500">
              {importPathError}
            </div>
          ) : importPathData ? (
            <ImportPathTreeView data={importPathData} onCheckedPathsChange={handleCheckedPathsChange} />
          ) : null}
        </div>

        <div
          className={[
            "shrink-0 pt-3 flex items-center gap-2",
            "border-t",
            theme === "dark"
              ? "border-gray-700 bg-gray-800"
              : "border-gray-200 bg-white",
          ].join(" ")}
        >
          <input
            type="text"
            value={initAutomateTestPath}
            onChange={(e) => setInitAutomateTestPath(e.target.value)}
            placeholder="Path for code base extraction"
            className={[
              "flex-1 rounded-md border px-3 py-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/40",
              theme === "dark"
                ? "border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-500"
                : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400",
            ].join(" ")}
            aria-label="Extract code base path"
          />
          <button
            type="button"
            onClick={handleInitAutomateTest}
            disabled={isImportPathLoading || !!importPathError || !importPathData}
            className={[
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              "bg-blue-600 text-white hover:bg-blue-700",
              isImportPathLoading || !!importPathError || !importPathData
                ? "opacity-60 cursor-not-allowed"
                : "cursor-pointer",
            ].join(" ")}
          >
            Extract Code Base
          </button>
        </div>
      </div>
    </Modal>
  );
}
