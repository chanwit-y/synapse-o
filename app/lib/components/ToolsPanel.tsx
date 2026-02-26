"use client";
/**
 * @file ToolsPanel.tsx
 * @description A tools panel for generating AI-powered test cases from file content, with modal interfaces for editing prompts and creating test case files.
 */

import { useEffect, useMemo, useState } from "react";
import { Copy, FlaskConical, FolderInput } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import Modal from "./Modal";
import { useLoading } from "./LoadingProvider";
import { useSnackbar } from "./Snackbar";
import { findCollectionById, testAI, updateCollectionDirectories } from "@/app/ui/doc/action";
import { getAllCodebases, getImportPathData } from "@/app/ui/codebase/action";
import type { CodebaseRow } from "@/app/lib/db/repository/codebase";
import { useFileContentQuery, useSaveFileMutation } from "@/app/lib/services/fileService.client";
import type { TreeNode } from "./@types/treeViewTypes";
import ImportPathTreeView, { type ImportPathEntry } from "./ImportPathTreeView";

interface ToolsPanelProps {
  fileId: string;
  fileName: string;
  collectionId: string;
  selectedFilePath: string | null;
  onAfterCreateTestCaseFile?: (opts: { node: TreeNode; nodePath: string }) => void;
}

function parseDirectories(raw: unknown): TreeNode[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as TreeNode[];

  if (typeof raw === "string") {
    // Tolerate historical double-encoding (JSON string inside JSON string).
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
  const normalizedBase = (baseName ?? "").trim() || "untitled.datatable";
  if (!existing.has(normalizedBase)) return normalizedBase;

  const stem = getStem(normalizedBase);
  const ext = getExtension(normalizedBase);
  for (let i = 2; i < 1000; i++) {
    const candidate = ext ? `${stem} (${i}).${ext}` : `${stem} (${i})`;
    if (!existing.has(candidate)) return candidate;
  }
  // Worst case fallback
  return `${stem}-${Date.now()}.${ext ?? "datatable"}`;
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function extractDataTableJson(raw: string): string {
  const trimmed = raw.trim();
  // Strip markdown code fences if present
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : trimmed;

  try {
    const parsed = JSON.parse(jsonStr) as unknown;

    // Already in DataTable format
    if (
      parsed &&
      typeof parsed === "object" &&
      "columns" in parsed &&
      "rows" in parsed &&
      Array.isArray((parsed as { columns: unknown }).columns) &&
      Array.isArray((parsed as { rows: unknown }).rows)
    ) {
      return JSON.stringify(parsed, null, 2);
    }

    // Array of objects – convert to DataTable format
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
      const allKeys = new Set<string>();
      for (const item of parsed) {
        if (item && typeof item === "object") {
          Object.keys(item as Record<string, unknown>).forEach((k) => allKeys.add(k));
        }
      }
      const columns = Array.from(allKeys);
      const rows = parsed.map((item) =>
        columns.map((col) => String((item as Record<string, unknown>)[col] ?? ""))
      );
      return JSON.stringify({ columns, rows }, null, 2);
    }
  } catch {
    /* not valid JSON – return as-is wrapped in a single-cell table */
  }

  return JSON.stringify(
    { columns: ["Content"], rows: [[raw.trim()]] },
    null,
    2,
  );
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

  // Fallback: if we can't resolve the path, drop into root
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

export default function ToolsPanel({
  fileId,
  fileName,
  collectionId,
  selectedFilePath,
  onAfterCreateTestCaseFile,
}: ToolsPanelProps) {
  const { theme } = useTheme();
  const { withLoading, activeLoaderIds } = useLoading();
  const { showSnackbar } = useSnackbar();
  const fileContentQuery = useFileContentQuery(fileId, { enabled: false });
  const saveFileMutation = useSaveFileMutation();
  const [isUnitTestModalOpen, setIsUnitTestModalOpen] = useState(false);
  const [aiResult, setAiResult] = useState<string>("");
  const [aiError, setAiError] = useState<string>("");
  const [isCopying, setIsCopying] = useState(false);
  const [isImportPathModalOpen, setIsImportPathModalOpen] = useState(false);
  const [importPathData, setImportPathData] = useState<ImportPathEntry[] | null>(null);
  const [isImportPathLoading, setIsImportPathLoading] = useState(false);
  const [importPathError, setImportPathError] = useState<string>("");
  const [codebases, setCodebases] = useState<CodebaseRow[]>([]);
  const [isCodebasesLoading, setIsCodebasesLoading] = useState(false);
  const [selectedCodebaseId, setSelectedCodebaseId] = useState<string>("");
  const [initAutomateTestPath, setInitAutomateTestPath] = useState(selectedFilePath ?? "");
  const MAX_CONTEXT_CHARS = 12000;
  const defaultUnitTestPrompt = useMemo(() => {
    return `Role:
Act as a Senior Quality Assurance Engineer with 10+ years of experience in software testing. You are detail-oriented, critical of vague requirements, and expert at finding edge cases.

Objective:
Create a comprehensive test suite for the following feature/requirement:

> **Generate test cases for the behavior of \`${fileName}\` (File ID: ${fileId}).**

Instructions:

1. Analyze the Requirement: briefly identify any logical gaps or ambiguity in the feature description before writing the cases.
2. Coverage: You must include:
* Positive Test Cases (Happy Path)
* Negative Test Cases (Error handling, invalid inputs)
* Boundary/Edge Cases (Min/max limits, empty states, special characters)
* Security/Performance (If applicable to the context)

3. Format: Output ONLY a valid JSON object (no markdown fences, no extra text) with this exact structure:
{
  "columns": ["TC_ID", "Type", "Scenario Description", "Pre-conditions", "Test Steps", "Test Data", "Expected Result", "Priority"],
  "rows": [
    ["TC001", "Positive", "...", "...", "1. Step one\\n2. Step two", "...", "...", "P1-Critical"],
    ["TC002", "Negative", "...", "...", "1. Step one", "...", "...", "P2-High"]
  ]
}

Constraints:

* Ensure steps are atomic and reproducible.
* Do not assume knowledge that isn't in the requirement; if you must assume, note it.
* Keep the tone professional and technical.
* Return ONLY the JSON object. No explanation, no markdown code fences.`;
  }, [fileId, fileName]);

  const buildUnitTestPromptWithContext = (content: string) => {
    const normalized = (content ?? "").replace(/\r\n/g, "\n");
    const truncated =
      normalized.length > MAX_CONTEXT_CHARS
        ? `${normalized.slice(0, MAX_CONTEXT_CHARS)}\n\n/* ... truncated: file content exceeded ${MAX_CONTEXT_CHARS} characters ... */\n`
        : normalized;

    return `Role: Act as a Senior Quality Assurance Engineer with over 10 years of experience in software testing. You specialize in translating Business Requirements, Functional Requirements, and User Stories into clear, structured, and comprehensive test cases.

You understand:
- Web applications
- Positive, negative, and edge case scenarios
- Functional, validation, and permission-based testing
- Business logic and real-world user behavior

Objective:
Create a comprehensive test suite for the following feature/requirement:

> **Generate test cases for the behavior of \`${fileName}\` (File ID: ${fileId}).**

Requirement context (source code):
\`\`\`
${truncated}
\`\`\`

Instructions:

1. Coverage: You must include:
* Use App ID in the test case steps.
* Positive Test Cases (Happy Path)
* Negative Test Cases (Error handling, invalid inputs)
* Boundary/Edge Cases (Min/max limits, empty states, special characters)
* Security/Performance (If applicable to the context)

2. Format: Output ONLY a valid JSON object (no markdown fences, no extra text) with this exact structure:
{
  "columns": ["TC_ID", "Type", "Scenario Description", "Pre-conditions", "Test Steps", "Test Data", "Expected Result", "Priority"],
  "rows": [
    ["TC001", "Positive", "...", "...", "1. Step one\\n2. Step two", "...", "...", "P1-Critical"],
    ["TC002", "Negative", "...", "...", "1. Step one", "...", "...", "P2-High"]
  ]
}

Constraints:

* Ensure steps are atomic and reproducible.
* Do not assume knowledge that isn't in the requirement; if you must assume, note it.
* Keep the tone professional and technical.
* Return ONLY the JSON object. No explanation, no markdown code fences.`;
  };

  const [unitTestPrompt, setUnitTestPrompt] = useState(defaultUnitTestPrompt);
  const unitTestLoaderId = `unit-test:${fileId}`;
  const unitTestContextLoaderId = `unit-test-context:${fileId}`;
  const createTestCaseFileLoaderId = `unit-test-create-file:${fileId}`;
  const isGenerating = activeLoaderIds.includes(unitTestLoaderId);
  const isPreparingContext = activeLoaderIds.includes(unitTestContextLoaderId);
  const isCreatingFile = activeLoaderIds.includes(createTestCaseFileLoaderId);
  const isBusy = isGenerating || isPreparingContext || isCreatingFile;

  useEffect(() => {
    setInitAutomateTestPath(selectedFilePath ?? "");
  }, [selectedFilePath]);

  const handleCreateUnitTest = async () => {
    setAiResult("");
    setAiError("");
    setIsUnitTestModalOpen(true);

    // Start with the base prompt immediately, then enrich with current file content.
    setUnitTestPrompt(defaultUnitTestPrompt);

    try {
      await withLoading(async () => {
        const { data } = await fileContentQuery.refetch();
        const content = data ?? "";
        setUnitTestPrompt(buildUnitTestPromptWithContext(content));
      }, unitTestContextLoaderId);
    } catch (error) {
      console.error("Failed to load file content for unit test prompt:", error);
      showSnackbar({
        variant: "warning",
        title: "Unit test prompt",
        message: "Could not load file content. Prompt opened without context.",
      });
    }
  };

  const handleGenerateUnitTest = async () => {
    try {
      await withLoading(async () => {
        setAiError("");
        const result = await testAI(unitTestPrompt);
        setAiResult(result ?? "");

        // Ensure the loading overlay becomes visible (LoadingProvider has a delay).
        // await new Promise((resolve) => setTimeout(resolve, 800));
      }, unitTestLoaderId);

      showSnackbar({
        variant: "info",
        title: "Unit test generation",
        message: "Generation complete.",
      });
      // setIsUnitTestModalOpen(false);
    } catch (error) {
      console.error("Unit test generation failed:", error);
      const message =
        error instanceof Error ? error.message : "Failed to generate unit tests.";
      setAiError(message);
      showSnackbar({
        variant: "error",
        title: "Unit test generation",
        message,
      });
    }
  };

  const handleCreateTestCaseFile = async () => {
    const content = aiResult ?? "";
    if (!content.trim()) return;
    if (!collectionId?.trim()) {
      showSnackbar({
        variant: "error",
        title: "Create test case file",
        message: "Missing collectionId for the selected file.",
      });
      return;
    }

    try {
      let createdNode: TreeNode | null = null;
      let createdNodePath: string | null = null;

      await withLoading(async () => {
        const collection = await findCollectionById(collectionId);
        const directories = parseDirectories(collection?.directories);

        const existingNames = new Set<string>();
        collectFileNames(directories, existingNames);

        const base = `${getStem(fileName)}.test-cases.datatable`;
        const name = pickUniqueName(base, existingNames);

        const dataTableContent = extractDataTableJson(content);

        const saved = await saveFileMutation.mutateAsync({
          id: null,
          name,
          collectionId,
          content: dataTableContent,
          icon: "flask-conical",
          tags: [{ id: createId(), label: "Test Case", color: "#60a5fa" }],
        });

        const now = Date.now();
        const newNodeId =
          saved.id ??
          (typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

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

        // Insert next to the selected file (same folder)
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

      // Close the modal immediately on success.
      setIsUnitTestModalOpen(false);

      if (createdNode && createdNodePath) {
        onAfterCreateTestCaseFile?.({ node: createdNode, nodePath: createdNodePath });
      }

      showSnackbar({
        variant: "success",
        title: "Create test case file",
        message: "Created a new file from the AI result.",
      });
    } catch (error) {
      console.error("Failed to create test case file:", error);
      const message =
        error instanceof Error ? error.message : "Failed to create test case file.";
      showSnackbar({
        variant: "error",
        title: "Create test case file",
        message,
      });
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
        // Fallback for older browsers / restricted contexts.
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

      showSnackbar({
        variant: "info",
        title: "Copy",
        message: "AI result copied to clipboard.",
      });
    } catch (error) {
      console.error("Copy failed:", error);
      showSnackbar({
        variant: "error",
        title: "Copy",
        message: "Failed to copy to clipboard.",
      });
    } finally {
      setIsCopying(false);
    }
  };

  const handleOpenImportPath = async () => {
    setIsImportPathModalOpen(true);
    setImportPathError("");
    setInitAutomateTestPath(selectedFilePath ?? "");

    if (codebases.length > 0) return;

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

  const handleInitAutomateTest = () => {
    const targetPath = initAutomateTestPath.trim();
    showSnackbar({
      variant: targetPath ? "info" : "warning",
      title: "Initialize automate test",
      message: targetPath
        ? `Automate test initialization is ready for path: ${targetPath}`
        : "Please provide a path before initializing automate test.",
    });
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Tools
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCreateUnitTest}
          className={[
            "flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors",
            theme === "dark"
              ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200",
          ].join(" ")}
          title="Create Unit Test"
          aria-label="Create unit test"
        >
          <FlaskConical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleOpenImportPath}
          className={[
            "flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors",
            theme === "dark"
              ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200",
          ].join(" ")}
          title="Open Import Path"
          aria-label="Open import path"
        >
          <FolderInput className="h-4 w-4" />
        </button>
      </div>

      <Modal
        isOpen={isUnitTestModalOpen}
        onClose={() => setIsUnitTestModalOpen(false)}
        size="xl"
      >
        <div className="flex max-h-[75vh] flex-col">
          {/* Scrollable body */}
          <div className="space-y-4 overflow-auto pr-1 pb-4">
            <h2 className="text-lg font-semibold">Create Test Case</h2>
            <p className="text-sm text-gray-500">
              Generate tests case for: <span className="font-medium">{fileName}</span>
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">
                Default prompt
              </label>
              {isPreparingContext ? (
                <div className="text-xs text-gray-400">
                  Loading file content for context…
                </div>
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
              <p className="text-xs text-gray-400">
                You can edit this prompt before generating tests.
              </p>
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
                    Click “Generate” to see the JSON data table response here.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Locked footer */}
          <div
            className={[
              "shrink-0 pt-4 flex justify-end gap-2",
              "border-t",
              theme === "dark"
                ? "border-gray-700 bg-gray-800"
                : "border-gray-200 bg-white",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => setIsUnitTestModalOpen(false)}
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
              onClick={handleCreateTestCaseFile}
              disabled={isBusy || !aiResult.trim()}
              className={[
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                theme === "dark"
                  ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300",
                isBusy || !aiResult.trim() ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
              ].join(" ")}
              title={aiResult.trim() ? "Create a new datatable file from the AI result" : "Generate a result first"}
              aria-label="Create test case file"
            >
              {isCreatingFile ? "Creating..." : "Create test case file"}
            </button>
            <button
              type="button"
              onClick={handleGenerateUnitTest}
              disabled={isBusy}
              className={[
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                "bg-blue-600 text-white hover:bg-blue-700",
                isBusy ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
              ].join(" ")}
            >
              {isPreparingContext ? "Preparing..." : isGenerating ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isImportPathModalOpen}
        onClose={() => setIsImportPathModalOpen(false)}
        size="xl"
      >
        <div className="flex h-[75vh] flex-col">
          <div className="shrink-0 border-b border-gray-200 pb-3 dark:border-gray-700">
            <h2 className="text-lg font-semibold">Import Path</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Select a codebase to browse file import relationships.
            </p>

            <div className="mt-3">
              <select
                value={selectedCodebaseId}
                onChange={(e) => handleSelectCodebase(e.target.value)}
                disabled={isCodebasesLoading}
                className={[
                  "w-full rounded-md border px-3 py-2 text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/40",
                  theme === "dark"
                    ? "border-gray-700 bg-gray-900 text-gray-100"
                    : "border-gray-300 bg-white text-gray-900",
                  isCodebasesLoading ? "opacity-60 cursor-not-allowed" : "",
                ].join(" ")}
                aria-label="Select codebase"
              >
                <option value="">
                  {isCodebasesLoading ? "Loading codebases..." : "— Select a codebase —"}
                </option>
                {codebases.map((cb) => (
                  <option key={cb.id} value={cb.id}>
                    {cb.name}
                  </option>
                ))}
              </select>
            </div>
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
              <ImportPathTreeView data={importPathData} />
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
              placeholder="Path for automate test initialization"
              className={[
                "flex-1 rounded-md border px-3 py-2 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/40",
                theme === "dark"
                  ? "border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-500"
                  : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400",
              ].join(" ")}
              aria-label="Initialize automate test path"
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
              Initialize Automate Test
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

