"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useTheme } from "./ThemeProvider";
import { useSnackbar } from "./Snackbar";
import {
  useFileContentQuery,
  useSaveFileMutation,
} from "../services/fileService.client";
import type { TreeNode } from "./@types/treeViewTypes";

interface CodeEditorProps {
  selectedFile: TreeNode | null;
}

function languageFromFileName(name: string): string {
  if (name.endsWith(".tsx")) return "typescriptreact";
  if (name.endsWith(".ts")) return "typescript";
  if (name.endsWith(".jsx")) return "javascriptreact";
  if (name.endsWith(".js")) return "javascript";
  if (name.endsWith(".json")) return "json";
  if (name.endsWith(".css")) return "css";
  if (name.endsWith(".html")) return "html";
  return "typescript";
}

export default function CodeEditor({ selectedFile }: CodeEditorProps) {
  const { theme } = useTheme();
  const { showSnackbar } = useSnackbar();
  const saveMutation = useSaveFileMutation();
  const { data: fileContent } = useFileContentQuery(selectedFile?.id);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const vimModeRef = useRef<{ dispose: () => void } | null>(null);
  const statusBarRef = useRef<HTMLDivElement | null>(null);
  const [localValue, setLocalValue] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);
  const [vimEnabled, setVimEnabled] = useState(false);

  const resolvedContent = fileContent ?? selectedFile?.content ?? "";
  const language = selectedFile ? languageFromFileName(selectedFile.name) : "typescript";

  useEffect(() => {
    setLocalValue(resolvedContent);
    setIsDirty(false);
  }, [resolvedContent]);

  const handleSave = useCallback(() => {
    if (!selectedFile || !isDirty) return;
    saveMutation.mutate(
      {
        id: selectedFile.id,
        name: selectedFile.name,
        collectionId: selectedFile.collectionId,
        content: localValue,
        icon: selectedFile.icon,
        tags: selectedFile.tags,
      },
      {
        onSuccess: () => {
          setIsDirty(false);
          showSnackbar({ message: "Saved", variant: "success" });
        },
        onError: (err) => {
          showSnackbar({
            message: err instanceof Error ? err.message : "Save failed",
            variant: "error",
          });
        },
      },
    );
  }, [selectedFile, isDirty, localValue, saveMutation, showSnackbar]);

  const enableVim = useCallback(async () => {
    const ed = editorRef.current;
    const statusEl = statusBarRef.current;
    if (!ed || !statusEl) return;

    const { initVimMode } = await import("monaco-vim");
    vimModeRef.current = initVimMode(ed, statusEl);
  }, []);

  const disableVim = useCallback(() => {
    vimModeRef.current?.dispose();
    vimModeRef.current = null;
    if (statusBarRef.current) statusBarRef.current.textContent = "";
  }, []);

  const toggleVim = useCallback(() => {
    setVimEnabled((prev) => {
      const next = !prev;
      if (next) {
        void enableVim();
      } else {
        disableVim();
      }
      return next;
    });
  }, [enableVim, disableVim]);

  useEffect(() => {
    return () => {
      vimModeRef.current?.dispose();
      vimModeRef.current = null;
    };
  }, []);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    editor.addAction({
      id: "save-file",
      label: "Save File",
      keybindings: [2048 | 49],
      run: () => handleSave(),
    });

    if (vimEnabled) {
      void enableVim();
    }
  };

  const handleChange = (value: string | undefined) => {
    const next = value ?? "";
    setLocalValue(next);
    setIsDirty(next !== resolvedContent);
  };

  if (!selectedFile) return null;

  return (
    <div className="w-full max-w-[980px] flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono ${
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {language}
          </span>
          <button
            type="button"
            onClick={toggleVim}
            className={[
              "px-2 py-0.5 text-xs rounded font-medium transition-colors border",
              vimEnabled
                ? theme === "dark"
                  ? "bg-green-800 text-green-200 border-green-600"
                  : "bg-green-100 text-green-800 border-green-300"
                : theme === "dark"
                  ? "bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700"
                  : "bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200",
            ].join(" ")}
          >
            Vim {vimEnabled ? "ON" : "OFF"}
          </button>
        </div>
        <button
          type="button"
          disabled={!isDirty || saveMutation.isPending}
          onClick={handleSave}
          className={[
            "px-3 py-1 text-xs rounded-md font-medium transition-colors",
            isDirty
              ? theme === "dark"
                ? "bg-blue-600 text-white hover:bg-blue-500"
                : "bg-blue-500 text-white hover:bg-blue-400"
              : theme === "dark"
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-gray-200 text-gray-400 cursor-not-allowed",
          ].join(" ")}
        >
          {saveMutation.isPending ? "Saving…" : "Save"}
        </button>
      </div>
      <div
        className={`rounded-lg overflow-hidden border flex-1 min-h-0 flex flex-col ${
          theme === "dark" ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language={language}
            theme={theme === "dark" ? "vs-dark" : "light"}
            value={localValue}
            onChange={handleChange}
            onMount={handleEditorMount}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
              automaticLayout: true,
              padding: { top: 16, bottom: 16 },
              cursorBlinking: vimEnabled ? "solid" : "blink",
            }}
          />
        </div>
        <div
          ref={statusBarRef}
          className={[
            "px-3 py-1 text-xs font-mono transition-all",
            vimEnabled ? "block" : "hidden",
            theme === "dark"
              ? "bg-gray-900 text-green-400 border-t border-gray-700"
              : "bg-gray-50 text-green-700 border-t border-gray-200",
          ].join(" ")}
        />
      </div>
    </div>
  );
}
