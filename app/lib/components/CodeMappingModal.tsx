"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import Modal from "./Modal";
import { useSnackbar } from "./Snackbar";
import { getAllCodebases, getImportPathData } from "@/app/ui/codebase/action";
import type { CodebaseRow } from "@/app/lib/db/repository/codebase";
import ImportPathTreeView, { type ImportPathEntry } from "./ImportPathTreeView";
import CustomSelect from "./CustomSelect";
import MarkdownDisplay from "./MarkdownDisplay";
import { invoke } from "@tauri-apps/api/core";
import { useLoading } from "./LoadingProvider";
import {
  useExtractCodeContextMutation,
  useSaveFileMutation,
} from "@/app/lib/services/fileService.client";
import { createSubFile, findCollectionById } from "@/app/ui/doc/action";
import type { TreeNode } from "./@types/treeViewTypes";

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

function collectFileNames(nodes: TreeNode[], acc: Set<string>) {
  nodes.forEach((node) => {
    if (node.type === "file") acc.add(node.name);
    if (node.type === "folder" && node.children?.length) {
      collectFileNames(node.children, acc);
    }
  });
}

function getStem(name: string) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "untitled";
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0) return trimmed;
  return trimmed.slice(0, lastDot);
}

function getExtension(name: string) {
  const trimmed = (name ?? "").trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot === -1 || lastDot === trimmed.length - 1) return null;
  return trimmed.slice(lastDot + 1);
}

function pickUniqueName(baseName: string, existing: Set<string>) {
  const normalizedBase = (baseName ?? "").trim() || "untitled.md";
  if (!existing.has(normalizedBase)) return normalizedBase;
  const stem = getStem(normalizedBase);
  const ext = getExtension(normalizedBase);
  for (let i = 2; i < 1000; i++) {
    const candidate = ext ? `${stem} (${i}).${ext}` : `${stem} (${i})`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${stem}-${Date.now()}.${ext ?? "md"}`;
}

export interface CodeMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  collectionId: string;
  selectedFilePath: string | null;
  onAfterCreateSubFile?: () => void;
  onNextStep?: () => void;
}

export default function CodeMappingModal({
  isOpen,
  onClose,
  fileId,
  fileName,
  collectionId,
  selectedFilePath,
  onAfterCreateSubFile,
  onNextStep,
}: CodeMappingModalProps) {
  const { theme } = useTheme();
  const { showSnackbar } = useSnackbar();
  const { startLoading, stopLoading } = useLoading();
  const extractCodeContextMutation = useExtractCodeContextMutation();
  const saveFileMutation = useSaveFileMutation();

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [importPathData, setImportPathData] = useState<ImportPathEntry[] | null>(null);
  const [isImportPathLoading, setIsImportPathLoading] = useState(false);
  const [importPathError, setImportPathError] = useState("");
  const [codebases, setCodebases] = useState<CodebaseRow[]>([]);
  const [isCodebasesLoading, setIsCodebasesLoading] = useState(false);
  const [selectedCodebaseId, setSelectedCodebaseId] = useState("");
  const [initAutomateTestPath, setInitAutomateTestPath] = useState(selectedFilePath ?? "");
  const [checkedFiles, setCheckedFiles] = useState<Set<string>>(new Set());
  const [isExtractComplete, setIsExtractComplete] = useState(false);
  const [extractedMarkdown, setExtractedMarkdown] = useState("");
  const [savedContentFileId, setSavedContentFileId] = useState<string | null>(null);

  useEffect(() => {
    setInitAutomateTestPath(selectedFilePath ?? "");
  }, [selectedFilePath]);

  useEffect(() => {
    if (!isOpen) return;
    setImportPathError("");
    setInitAutomateTestPath(selectedFilePath ?? "");
    setIsExtractComplete(false);
    setExtractedMarkdown("");
    setSavedContentFileId(null);

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

  const handleInitAutomateTest = async () => {
    const targetPath = initAutomateTestPath.trim();
    const selected = codebases.find((c) => c.id === selectedCodebaseId);
    const srcPrefix = selected?.importSrcPath?.replace(/\/+$/, "") ?? "";
    const selectedFilesList = Array.from(checkedFiles).map((p) => {
      const cleaned = p.replace(/^src\//, "");
      return srcPrefix ? `${srcPrefix}/${cleaned}` : cleaned;
    });

    console.log("[Extract Code Base] selected files:", selectedFilesList);

    const loaderId = startLoading("extract-code-base");

    try {
      const codes: string[] = [];
      for (const path of selectedFilesList) {
        const code = await invoke<string>("read_file", { path });
        codes.push(code);
      }

      if (codes.length === 0) {
        showSnackbar({
          variant: "warning",
          title: "Extract code base",
          message: "No files selected to extract.",
        });
        return;
      }

      const result = await extractCodeContextMutation.mutateAsync(codes);

      console.log("[AI Extract Code Context] result:", result);

      if (!result.trim()) {
        showSnackbar({
          variant: "warning",
          title: "Extract code base",
          message: "AI returned empty result.",
        });
        return;
      }

      const collection = await findCollectionById(collectionId);
      const directories = parseDirectories(collection?.directories);
      const existingNames = new Set<string>();
      collectFileNames(directories, existingNames);

      const base = `${getStem(fileName)}.codebase.md`;
      const name = pickUniqueName(base, existingNames);

      const saved = await saveFileMutation.mutateAsync({
        id: null,
        name,
        collectionId,
        content: result.trim(),
        icon: "braces",
        tags: [{ id: crypto.randomUUID(), label: "Codebase", color: "#34d399" }],
      });

      const contentFileId =
        saved.id ??
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

      setSavedContentFileId(contentFileId);
      setIsExtractComplete(true);
      setExtractedMarkdown(result.trim());

      showSnackbar({
        variant: "success",
        title: "Extract code base",
        message: targetPath
          ? `Code context saved as "${name}" for path: ${targetPath}`
          : `Code context saved as "${name}".`,
      });
    } catch (error) {
      console.error("AI extract code context error:", error);
      showSnackbar({
        variant: "error",
        title: "AI extraction failed",
        message: error instanceof Error ? error.message : "Unexpected error.",
      });
    } finally {
      stopLoading(loaderId);
    }
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
          {extractedMarkdown ? (
            <div className="h-full overflow-y-auto rounded-md border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Extraction Result
                </h3>
                <button
                  type="button"
                  onClick={() => { setExtractedMarkdown(""); setIsExtractComplete(false); }}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to file tree
                </button>
              </div>
              <MarkdownDisplay
                content={extractedMarkdown}
                theme={theme}
                animate={{ enabled: true, intervalMs: 8, chunkSize: 12 }}
                autoScroll={{ enabled: true }}
              />
            </div>
          ) : !selectedCodebaseId ? (
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
            disabled={isImportPathLoading || !!importPathError || !importPathData || isExtractComplete}
            className={[
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              "bg-blue-600 text-white hover:bg-blue-700",
              isImportPathLoading || !!importPathError || !importPathData || isExtractComplete
                ? "opacity-60 cursor-not-allowed"
                : "cursor-pointer",
            ].join(" ")}
          >
            Extract Code Base
          </button>
          <button
            type="button"
            onClick={async () => {
              if (savedContentFileId) {
                await createSubFile(fileId, savedContentFileId);
                onAfterCreateSubFile?.();
              }
              onClose();
              setIsFullScreen(false);
              onNextStep?.();
            }}
            disabled={!isExtractComplete}
            className={[
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              "bg-emerald-600 text-white hover:bg-emerald-700",
              !isExtractComplete ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
}
