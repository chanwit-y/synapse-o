"use client";

import { useState } from "react";
import { FileCode2, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useTheme } from "./ThemeProvider";
import { useSnackbar } from "./Snackbar";
import { useFileContentQuery, useSaveFileMutation } from "../services/fileService.client";
import { createSubFile } from "@/app/ui/doc/action";

interface E2eCodeToolsPanelProps {
  fileId: string;
  collectionId: string;
  onAfterCreateSubFile?: () => void;
}

function getBaseName(path: string): string {
  const segments = path.split("/");
  return segments[segments.length - 1] || path;
}

export default function E2eCodeToolsPanel({
  fileId,
  collectionId,
  onAfterCreateSubFile,
}: E2eCodeToolsPanelProps) {
  const { theme } = useTheme();
  const { showSnackbar } = useSnackbar();
  const { data: fileContent } = useFileContentQuery(fileId);
  const saveFileMutation = useSaveFileMutation();
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtract = async () => {
    const content = fileContent ?? "";
    if (!content.trim()) {
      showSnackbar({ message: "No content to extract", variant: "error" });
      return;
    }
    setIsExtracting(true);
    try {
      const files = await invoke<Record<string, string>>("extract_files", { content });
      const entries = Object.entries(files);
      console.log("files", files);
      if (entries.length === 0) {
        showSnackbar({
          variant: "warning",
          title: "Extract md to code",
          message: "No file blocks found in markdown.",
        });
        return;
      }

      let created = 0;
      for (const [path, code] of entries) {
        const name = getBaseName(path);

        const saved = await saveFileMutation.mutateAsync({
          id: null,
          name,
          collectionId,
          content: code,
          icon: "file-code-2",
          tags: [{ id: crypto.randomUUID(), label: "E2E Code", color: "#34d399" }],
        });

        const contentFileId =
          saved.id ??
          (typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

        await createSubFile(fileId, contentFileId);
        created++;
      }

      onAfterCreateSubFile?.();

      showSnackbar({
        variant: "success",
        title: "Extract md to code",
        message: `Extracted and saved ${created} file(s) as sub-files.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Extraction failed";
      showSnackbar({ message: msg, variant: "error" });
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        E2E Code Tools
      </div>
      <div className="flex items-center gap-2">
        <div className="group relative">
          <button
            type="button"
            onClick={handleExtract}
            disabled={isExtracting}
            className={[
              "flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors",
              isExtracting
                ? "opacity-50 cursor-wait bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
                : theme === "dark"
                  ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            ].join(" ")}
            aria-label="Extract md to code"
          >
            {isExtracting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileCode2 className="h-4 w-4" />
            )}
          </button>
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Extract md to code
          </span>
        </div>
      </div>
    </div>
  );
}
