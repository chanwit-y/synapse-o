"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Copy } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import Modal from "./Modal";
import { useLoading } from "./LoadingProvider";
import { useSnackbar } from "./Snackbar";
import {
  createSubFile,
  findCollectionById,
  testAI,
  updateCollectionDirectories,
} from "@/app/ui/doc/action";
import { useFileContentQuery, useSaveFileMutation } from "@/app/lib/services/fileService.client";
import type { TreeNode } from "./@types/treeViewTypes";

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

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

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function insertNextToSelectedFile(opts: {
  directories: TreeNode[];
  selectedFilePath: string | null;
  selectedFileName: string;
  newNode: TreeNode;
}) {
  const { directories, selectedFilePath, selectedFileName, newNode } = opts;
  const rawPath = (selectedFilePath ?? "").trim();
  const pathSegments = rawPath ? rawPath.split("/").filter(Boolean) : [];
  const fileSegment = pathSegments.length ? pathSegments[pathSegments.length - 1] : selectedFileName;
  const parentSegments = pathSegments.length > 1 ? pathSegments.slice(0, -1) : [];

  const findFolderByPath = (nodes: TreeNode[], segments: string[]): TreeNode | null => {
    if (segments.length === 0) return null;
    const [head, ...rest] = segments;
    const current = nodes.find((n) => n.name === head) ?? null;
    if (!current) return null;
    if (rest.length === 0) return current;
    if (current.type !== "folder") return null;
    return findFolderByPath(current.children ?? [], rest);
  };

  const insertIntoList = (list: TreeNode[]) => {
    const idx = list.findIndex((n) => n.type === "file" && n.name === fileSegment);
    if (idx === -1) {
      list.push(newNode);
    } else {
      list.splice(idx + 1, 0, newNode);
    }
  };

  if (parentSegments.length === 0) {
    insertIntoList(directories);
    return;
  }

  const folder = findFolderByPath(directories, parentSegments);
  if (folder && folder.type === "folder") {
    folder.children = folder.children ?? [];
    insertIntoList(folder.children);
    return;
  }

  insertIntoList(directories);
}

function findNodePathById(nodes: TreeNode[], nodeId: string, prefix: string[] = []): string | null {
  for (const node of nodes) {
    const nextPrefix = [...prefix, node.name];
    if (node.id === nodeId) return nextPrefix.join("/");
    if (node.type === "folder" && node.children?.length) {
      const found = findNodePathById(node.children, nodeId, nextPrefix);
      if (found) return found;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// AI result preview (table or raw)
// ---------------------------------------------------------------------------

function AiResultTablePreview({ raw, theme }: { raw: string; theme: string }) {
  const isDark = theme === "dark";
  const parsed = (() => {
    try {
      const trimmed = raw.trim();
      const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
      const jsonStr = fenceMatch ? fenceMatch[1].trim() : trimmed;
      const obj = JSON.parse(jsonStr) as unknown;

      if (
        obj &&
        typeof obj === "object" &&
        "columns" in obj &&
        "rows" in obj &&
        Array.isArray((obj as { columns: unknown }).columns) &&
        Array.isArray((obj as { rows: unknown }).rows)
      ) {
        return obj as { columns: string[]; rows: string[][] };
      }

      if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === "object") {
        const allKeys = new Set<string>();
        for (const item of obj) {
          if (item && typeof item === "object") {
            Object.keys(item as Record<string, unknown>).forEach((k) => allKeys.add(k));
          }
        }
        const columns = Array.from(allKeys);
        const rows = obj.map((item) =>
          columns.map((col) => String((item as Record<string, unknown>)[col] ?? ""))
        );
        return { columns, rows };
      }
    } catch {
      /* not valid JSON */
    }
    return null;
  })();

  if (!parsed) {
    return (
      <pre
        className={[
          "whitespace-pre-wrap text-xs overflow-auto max-h-[40vh]",
          isDark ? "text-gray-300" : "text-gray-700",
        ].join(" ")}
      >
        {raw}
      </pre>
    );
  }

  const borderColor = isDark ? "border-gray-700" : "border-gray-200";
  const thBg = isDark ? "bg-gray-800" : "bg-gray-100";
  const textColor = isDark ? "text-gray-100" : "text-gray-900";
  const cellBg = isDark ? "bg-gray-900" : "bg-white";

  return (
    <div className="overflow-auto max-h-[40vh] rounded-md border" style={{ borderColor: isDark ? "#374151" : "#e5e7eb" }}>
      <table className={`w-full border-collapse text-xs ${borderColor}`}>
        <thead className="sticky top-0 z-10">
          <tr>
            {parsed.columns.map((col, i) => (
              <th
                key={i}
                className={`border ${borderColor} ${thBg} px-2 py-1.5 text-left font-semibold ${textColor} whitespace-nowrap`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parsed.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`border ${borderColor} ${cellBg} px-2 py-1.5 ${textColor} whitespace-pre-wrap`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CreateTestCaseModal
// ---------------------------------------------------------------------------

export interface CreateTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  collectionId: string;
  selectedFilePath: string | null;
  onAfterCreateTestCaseFile?: (opts: { node: TreeNode; nodePath: string }) => void;
  /** Called after the "Next" button successfully creates the file + sub-file link. */
  onNextStep?: () => void;
  /** Called after a sub-file is created so the sidebar can reload. */
  onAfterCreateSubFile?: () => void;
}

const MAX_CONTEXT_CHARS = 12000;

export default function CreateTestCaseModal({
  isOpen,
  onClose,
  fileId,
  fileName,
  collectionId,
  selectedFilePath,
  onAfterCreateTestCaseFile,
  onNextStep,
  onAfterCreateSubFile,
}: CreateTestCaseModalProps) {
  const { theme } = useTheme();
  const { withLoading, activeLoaderIds } = useLoading();
  const { showSnackbar } = useSnackbar();
  const fileContentQuery = useFileContentQuery(fileId, { enabled: false });
  const saveFileMutation = useSaveFileMutation();

  const [aiResult, setAiResult] = useState("");
  const [aiError, setAiError] = useState("");
  const [isCopying, setIsCopying] = useState(false);

  const defaultUnitTestPrompt = useMemo(() => {
    return `You are a senior QA Engineer specializing in E2E testing.

Objective:
Create a comprehensive test suite for the following feature/requirement:

For each scenario, provide:
1. Scenario ID and descriptive name
2. Preconditions (initial state required before the test)
3. Steps (user actions in exact order)
4. Expected Results (what should be visible/happen after each key step)
5. Required Test Data
6. Category: Happy Path / Edge Case / Error Case / Boundary

Ensure full coverage across:
- Every happy path flow
- All validation errors
- Edge cases (empty input, max length, special characters, duplicates)
- Permission/authorization cases (if applicable)
- All possible state transitions

User Story:
"""
[paste user story here]
"""
`;
  }, [fileId, fileName]);

  const buildPromptWithContext = (content: string) => {
    const normalized = (content ?? "").replace(/\r\n/g, "\n");
    const truncated =
      normalized.length > MAX_CONTEXT_CHARS
        ? `${normalized.slice(0, MAX_CONTEXT_CHARS)}\n\n/* ... truncated: file content exceeded ${MAX_CONTEXT_CHARS} characters ... */\n`
        : normalized;

    return `You are a senior QA Engineer specializing in E2E testing.

From the User Story below, extract all possible Test Scenarios.

For each scenario, provide:
1. Scenario ID and descriptive name
2. Preconditions (initial state required before the test)
3. Steps (user actions in exact order)
4. Expected Results (what should be visible/happen after each key step)
5. Required Test Data
6. Category: Happy Path / Edge Case / Error Case / Boundary

Ensure full coverage across:
- Every happy path flow
- All validation errors
- Edge cases (empty input, max length, special characters, duplicates)
- Permission/authorization cases (if applicable)
- All possible state transitions

User Story:
"""
[paste user story here]
"""

> **Generate test scenarios for \`${fileName}\` (File ID: ${fileId}).**

Requirement context (source code):
\`\`\`
${truncated}
\`\`\`
`;
  };

  const [unitTestPrompt, setUnitTestPrompt] = useState(defaultUnitTestPrompt);

  const unitTestLoaderId = `unit-test:${fileId}`;
  const unitTestContextLoaderId = `unit-test-context:${fileId}`;
  const createTestCaseFileLoaderId = `unit-test-create-file:${fileId}`;
  const isGenerating = activeLoaderIds.includes(unitTestLoaderId);
  const isPreparingContext = activeLoaderIds.includes(unitTestContextLoaderId);
  const isCreatingFile = activeLoaderIds.includes(createTestCaseFileLoaderId);
  const isBusy = isGenerating || isPreparingContext || isCreatingFile;

  // Load file content for context when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setAiResult("");
    setAiError("");
    setUnitTestPrompt(defaultUnitTestPrompt);

    (async () => {
      try {
        await withLoading(async () => {
          const { data } = await fileContentQuery.refetch();
          const content = data ?? "";
          setUnitTestPrompt(buildPromptWithContext(content));
        }, unitTestContextLoaderId);
      } catch (error) {
        console.error("Failed to load file content for unit test prompt:", error);
        showSnackbar({
          variant: "warning",
          title: "Unit test prompt",
          message: "Could not load file content. Prompt opened without context.",
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleGenerate = async () => {
    try {
      await withLoading(async () => {
        setAiError("");
        const result = await testAI(unitTestPrompt);
        setAiResult(result ?? "");
      }, unitTestLoaderId);

      showSnackbar({
        variant: "info",
        title: "Unit test generation",
        message: "Generation complete.",
      });
    } catch (error) {
      console.error("Unit test generation failed:", error);
      const message =
        error instanceof Error ? error.message : "Failed to generate unit tests.";
      setAiError(message);
      showSnackbar({ variant: "error", title: "Unit test generation", message });
    }
  };

  const doCreateFile = async (): Promise<string | null> => {
    const content = aiResult ?? "";
    if (!content.trim()) return null;
    if (!collectionId?.trim()) {
      showSnackbar({
        variant: "error",
        title: "Create test case file",
        message: "Missing collectionId for the selected file.",
      });
      return null;
    }

    try {
      let createdNode: TreeNode | null = null;
      let createdNodePath: string | null = null;
      let createdFileId: string | null = null;

      await withLoading(async () => {
        const collection = await findCollectionById(collectionId);
        const directories = parseDirectories(collection?.directories);

        const existingNames = new Set<string>();
        collectFileNames(directories, existingNames);

        const base = `${getStem(fileName)}.scenario.md`;
        const name = pickUniqueName(base, existingNames);

        const saved = await saveFileMutation.mutateAsync({
          id: null,
          name,
          collectionId,
          content: content.trim(),
          icon: "flask-conical",
          tags: [{ id: createId(), label: "Test Case", color: "#60a5fa" }],
        });

        const now = Date.now();
        const newNodeId =
          saved.id ??
          (typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

        createdFileId = newNodeId;

        const newNode: TreeNode = {
          id: newNodeId,
          collectionId,
          name,
          type: "file",
          tags: [{ id: createId(), label: "Test Case", color: "#60a5fa" }],
          icon: "flask-conical",
          extension: getExtension(name),
          content: null,
          createdAt: now,
          updatedAt: now,
        };

        const updatedDirectories: TreeNode[] = JSON.parse(JSON.stringify(directories));
        insertNextToSelectedFile({
          directories: updatedDirectories,
          selectedFilePath,
          selectedFileName: fileName,
          newNode,
        });

        await updateCollectionDirectories(collectionId, updatedDirectories);

        createdNode = newNode;
        createdNodePath =
          findNodePathById(updatedDirectories, newNodeId) ??
          (() => {
            const rawPath = (selectedFilePath ?? "").trim();
            const parentSegments = rawPath
              ? rawPath.split("/").filter(Boolean).slice(0, -1)
              : [];
            return [...parentSegments, name].join("/");
          })();
      }, createTestCaseFileLoaderId);

      onClose();

      if (createdNode && createdNodePath) {
        onAfterCreateTestCaseFile?.({ node: createdNode, nodePath: createdNodePath });
      }

      showSnackbar({
        variant: "success",
        title: "Create test case file",
        message: "Created a new file from the AI result.",
      });
      return createdFileId;
    } catch (error) {
      console.error("Failed to create test case file:", error);
      const message =
        error instanceof Error ? error.message : "Failed to create test case file.";
      showSnackbar({ variant: "error", title: "Create test case file", message });
      return null;
    }
  };

  const handleCreateFile = async () => {
    await doCreateFile();
  };

  const handleNext = async () => {
    const content = aiResult ?? "";
    if (!content.trim()) return;
    if (!collectionId?.trim()) {
      showSnackbar({
        variant: "error",
        title: "Create sub-file",
        message: "Missing collectionId for the selected file.",
      });
      return;
    }

    try {
      await withLoading(async () => {
        const collection = await findCollectionById(collectionId);
        const directories = parseDirectories(collection?.directories);

        const existingNames = new Set<string>();
        collectFileNames(directories, existingNames);

        const base = `${getStem(fileName)}.scenario.md`;
        const name = pickUniqueName(base, existingNames);

        const saved = await saveFileMutation.mutateAsync({
          id: null,
          name,
          collectionId,
          content: content.trim(),
          icon: "flask-conical",
          tags: [{ id: createId(), label: "Test Case", color: "#60a5fa" }],
        });

        const contentFileId =
          saved.id ??
          (typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

        await createSubFile(fileId, contentFileId);
      }, createTestCaseFileLoaderId);

      onClose();
      onAfterCreateSubFile?.();

      showSnackbar({
        variant: "success",
        title: "Create sub-file",
        message: "Created a new sub-file from the AI result.",
      });

      onNextStep?.();
    } catch (error) {
      console.error("Failed to create sub-file:", error);
      const message =
        error instanceof Error ? error.message : "Failed to create sub-file.";
      showSnackbar({ variant: "error", title: "Create sub-file", message });
    }
  };

  const copyToClipboard = async (text: string) => {
    const value = text ?? "";
    if (!value.trim()) return;

    setIsCopying(true);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.top = "-1000px";
        textarea.style.left = "-1000px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      showSnackbar({ variant: "info", title: "Copy", message: "AI result copied to clipboard." });
    } catch (error) {
      console.error("Copy failed:", error);
      showSnackbar({ variant: "error", title: "Copy", message: "Failed to copy to clipboard." });
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex max-h-[75vh] flex-col">
        <div className="space-y-4 overflow-auto pr-1 pb-4">
          <h2 className="text-lg font-semibold">Create Scenarios</h2>
          <p className="text-sm text-gray-500">
            Generate tests case for: <span className="font-medium">{fileName}</span>
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">Default prompt</label>
            {isPreparingContext ? (
              <div className="text-xs text-gray-400">Loading file content for context\u2026</div>
            ) : null}
            <textarea
              value={unitTestPrompt}
              onChange={(e) => setUnitTestPrompt(e.target.value)}
              rows={10}
              spellCheck={false}
              className={[
                "w-full rounded-md border px-3 py-2 text-sm leading-5",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/40",
                theme === "dark"
                  ? "border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-500"
                  : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400",
              ].join(" ")}
            />
            <p className="text-xs text-gray-400">You can edit this prompt before generating tests.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-gray-600">AI result</div>
              <button
                type="button"
                onClick={() => copyToClipboard(aiResult)}
                disabled={isBusy || isCopying || !aiResult.trim()}
                className={[
                  "inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs transition-colors",
                  theme === "dark"
                    ? "border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                  isBusy || isCopying || !aiResult.trim()
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer",
                ].join(" ")}
                title={aiResult.trim() ? "Copy AI result" : "Nothing to copy"}
                aria-label="Copy AI result"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div
              className={[
                "rounded-md border p-3",
                theme === "dark"
                  ? "border-gray-700 bg-gray-900/40"
                  : "border-gray-200 bg-gray-50",
              ].join(" ")}
            >
              {aiError ? (
                <div className={theme === "dark" ? "text-red-300 text-sm" : "text-red-700 text-sm"}>
                  {aiError}
                </div>
              ) : aiResult ? (
                <AiResultTablePreview raw={aiResult} theme={theme} />
              ) : (
                <div className={theme === "dark" ? "text-gray-400 text-sm" : "text-gray-500 text-sm"}>
                  Click &quot;Generate&quot; to see the JSON data table response here.
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className={[
            "shrink-0 pt-4 flex justify-end gap-2",
            "border-t",
            theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className={[
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              theme === "dark"
                ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300",
              isBusy ? "opacity-60 cursor-not-allowed" : "",
            ].join(" ")}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isBusy}
            className={[
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              "bg-blue-600 text-white hover:bg-blue-700",
              isBusy ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            {isPreparingContext ? "Preparing..." : isGenerating ? "Generating..." : "Generate"}
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={isBusy || !aiResult.trim()}
            className={[
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              theme === "dark"
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-emerald-600 text-white hover:bg-emerald-700",
              isBusy || !aiResult.trim() ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
            title={aiResult.trim() ? "Create test case file and open Code Mapping" : "Generate a result first"}
            aria-label="Create test case file and proceed to Code Mapping"
          >
            {isCreatingFile ? "Creating..." : "Next"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
}
