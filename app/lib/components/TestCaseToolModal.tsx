"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "@/app/lib/components/Modal";
import { useTheme } from "./ThemeProvider";
import { FlaskConical, Loader2, Copy, Check, ArrowRight } from "lucide-react";
import {
  getSubFilesByFileId,
  testAI,
  createSubFile,
  findCollectionById,
  updateCollectionDirectories,
} from "@/app/ui/doc/action";
import { fileService, useSaveFileMutation } from "@/app/lib/services/fileService.client";
import MarkdownDisplay from "./MarkdownDisplay";
import { useLoading } from "./LoadingProvider";
import { useSnackbar } from "./Snackbar";
import type { TreeNode } from "./@types/treeViewTypes";

interface TestCaseToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  collectionId: string;
  selectedFilePath: string | null;
  onAfterCreateSubFile?: () => void;
}

const MAX_CONTEXT_CHARS = 12000;

const SYSTEM_PROMPT = `You are a QA Automation Engineer.

Merge the Test Scenarios and Technical Context below into 
complete, implementation-ready Test Cases for Playwright.

For each Test Case, specify:

1. **Test ID**: TC-XXX
2. **Title**: the exact string to use in test.describe / test()
3. **Category**: Happy / Edge / Error / Boundary
4. **Preconditions**:
   - URL to navigate to
   - State to set up (authentication, seed data, etc.)
   - APIs to mock (if any), with exact endpoint and response body
5. **Steps**: for each step provide
   - Action: click / fill / select / navigate / wait / hover
   - Target: exact selector from the Technical Context
   - Value: input value (if applicable)
6. **Assertions**: for each assertion provide
   - Type: visible / hidden / text / url / count / disabled / API-called
   - Target: exact selector or URL
   - Expected value
7. **Test Data**: concrete values used in each step
8. **API Mocks** (if needed): endpoint, method, status code, 
   response body

Do NOT invent selectors. Use only selectors from the Technical Context.
If a selector is missing, flag it explicitly.`;

function truncate(text: string | null, max: number): string {
  if (!text) return "";
  const normalized = text.replace(/\r\n/g, "\n");
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}\n\n/* ... truncated: content exceeded ${max} characters ... */\n`;
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

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function collectFileNames(nodes: TreeNode[], acc: Set<string>) {
  nodes.forEach((node) => {
    if (node.type === "file") acc.add(node.name);
    if (node.type === "folder" && node.children?.length) {
      collectFileNames(node.children, acc);
    }
  });
}

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
        } catch { return []; }
      }
      return [];
    } catch { return []; }
  }
  return [];
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

export default function TestCaseToolModal({
  isOpen,
  onClose,
  fileId,
  fileName,
  collectionId,
  selectedFilePath,
  onAfterCreateSubFile,
}: TestCaseToolModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { withLoading, activeLoaderIds } = useLoading();
  const { showSnackbar } = useSnackbar();
  const saveFileMutation = useSaveFileMutation();

  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [scenarioContent, setScenarioContent] = useState<string | null>(null);
  const [codebaseContent, setCodebaseContent] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState("");
  const [aiError, setAiError] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const generateLoaderId = `test-case-gen:${fileId}`;
  const saveLoaderId = `test-case-save:${fileId}`;
  const isGenerating = activeLoaderIds.includes(generateLoaderId);
  const isSaving = activeLoaderIds.includes(saveLoaderId);
  const isBusy = isGenerating || isSaving || isLoadingContext;

  const loadSubFileContents = useCallback(async () => {
    if (!fileId?.trim()) return;
    setIsLoadingContext(true);
    setScenarioContent(null);
    setCodebaseContent(null);

    try {
      const entries = await getSubFilesByFileId(fileId);

      const scenarioEntry = entries.find(
        (e) => e.extension === "scenario" || (e.fileName?.includes(".scenario") ?? false),
      );
      const codebaseEntry = entries.find(
        (e) => e.extension === "codebase" || (e.fileName?.includes(".codebase") ?? false),
      );

      const [scenarioText, codebaseText] = await Promise.all([
        scenarioEntry ? fileService.loadFile(scenarioEntry.contentFileId) : Promise.resolve(null),
        codebaseEntry ? fileService.loadFile(codebaseEntry.contentFileId) : Promise.resolve(null),
      ]);

      setScenarioContent(scenarioText);
      setCodebaseContent(codebaseText);
    } catch (err) {
      console.error("Failed to load sub-file contents:", err);
    } finally {
      setIsLoadingContext(false);
    }
  }, [fileId]);

  useEffect(() => {
    if (isOpen) {
      setAiResult("");
      setAiError("");
      void loadSubFileContents();
    }
  }, [isOpen, loadSubFileContents]);

  const buildPrompt = () => {
    const scenario = truncate(scenarioContent, MAX_CONTEXT_CHARS);
    const codebase = truncate(codebaseContent, MAX_CONTEXT_CHARS);

    return `${SYSTEM_PROMPT}

Test Scenarios:
\`\`\`
${scenario || "(no .scenario file available)"}
\`\`\`

Technical Context:
\`\`\`
${codebase || "(no .codebase file available)"}
\`\`\`
`;
  };

  const handleGenerate = async () => {
    if (!scenarioContent && !codebaseContent) {
      showSnackbar({
        variant: "warning",
        title: "Test Case",
        message: "No .scenario or .codebase content found. Please create them first.",
      });
      return;
    }

    try {
      await withLoading(async () => {
        setAiError("");
        const prompt = buildPrompt();
        const result = await testAI(prompt);
        setAiResult(result ?? "");
      }, generateLoaderId);

      showSnackbar({
        variant: "success",
        title: "Test Case",
        message: "Test cases generated successfully.",
      });
    } catch (error) {
      console.error("Test case generation failed:", error);
      const message = error instanceof Error ? error.message : "Failed to generate test cases.";
      setAiError(message);
      showSnackbar({ variant: "error", title: "Test Case", message });
    }
  };

  const handleSaveAsSubFile = async () => {
    const content = aiResult?.trim();
    if (!content) return;
    if (!collectionId?.trim()) {
      showSnackbar({
        variant: "error",
        title: "Save Test Case",
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

        const base = `${getStem(fileName)}.testcase.md`;
        const name = pickUniqueName(base, existingNames);

        const saved = await saveFileMutation.mutateAsync({
          id: null,
          name,
          collectionId,
          content,
          icon: "flask-conical",
          tags: [{ id: createId(), label: "Test Case", color: "#a855f7" }],
        });

        const contentFileId =
          saved.id ??
          (typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

        await createSubFile(fileId, contentFileId);
      }, saveLoaderId);

      onClose();
      onAfterCreateSubFile?.();

      showSnackbar({
        variant: "success",
        title: "Save Test Case",
        message: "Test case saved as a sub-file.",
      });
    } catch (error) {
      console.error("Failed to save test case:", error);
      const message = error instanceof Error ? error.message : "Failed to save test case.";
      showSnackbar({ variant: "error", title: "Save Test Case", message });
    }
  };

  const copyToClipboard = async () => {
    if (!aiResult.trim()) return;
    try {
      await navigator.clipboard.writeText(aiResult);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      showSnackbar({ variant: "info", title: "Copy", message: "Copied to clipboard." });
    } catch {
      showSnackbar({ variant: "error", title: "Copy", message: "Failed to copy." });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex max-h-[80vh] flex-col">
        <div className="space-y-4 overflow-auto pr-1 pb-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-500" />
            <h2 className="text-xl font-semibold">Test Case</h2>
          </div>

          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Generate Playwright test cases for{" "}
            <span className="font-medium">{fileName}</span> using .scenario and .codebase context.
          </p>

          {isLoadingContext ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Loading context…
              </span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div
                  className={`rounded-lg border p-3 ${
                    isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                        isDark ? "bg-blue-900/40 text-blue-300" : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      .scenario
                    </span>
                    {scenarioContent && (
                      <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                        {scenarioContent.length.toLocaleString()} chars
                      </span>
                    )}
                  </div>
                  {scenarioContent ? (
                    <div className="max-h-48 overflow-auto">
                      <MarkdownDisplay content={scenarioContent} theme={theme} animate={{ enabled: false }} />
                    </div>
                  ) : (
                    <p className={`text-sm italic ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      No .scenario file found.
                    </p>
                  )}
                </div>

                <div
                  className={`rounded-lg border p-3 ${
                    isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                        isDark ? "bg-green-900/40 text-green-300" : "bg-green-100 text-green-700"
                      }`}
                    >
                      .codebase
                    </span>
                    {codebaseContent && (
                      <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                        {codebaseContent.length.toLocaleString()} chars
                      </span>
                    )}
                  </div>
                  {codebaseContent ? (
                    <div className="max-h-48 overflow-auto">
                      <MarkdownDisplay content={codebaseContent} theme={theme} animate={{ enabled: false }} />
                    </div>
                  ) : (
                    <p className={`text-sm italic ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      No .codebase file found.
                    </p>
                  )}
                </div>
              </div>

              {(aiResult || aiError) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Generated Test Cases
                    </span>
                    {aiResult && (
                      <button
                        type="button"
                        onClick={() => void copyToClipboard()}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                          isDark
                            ? "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                            : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        }`}
                      >
                        {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {isCopied ? "Copied" : "Copy"}
                      </button>
                    )}
                  </div>
                  <div
                    className={`rounded-lg border p-4 max-h-[40vh] overflow-auto ${
                      isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    {aiError ? (
                      <p className="text-sm text-red-500">{aiError}</p>
                    ) : (
                      <MarkdownDisplay content={aiResult} theme={theme} animate={{ enabled: false }} />
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div
          className={`shrink-0 flex justify-end gap-2 pt-4 border-t ${
            isDark ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isDark
                ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } ${isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isBusy || (!scenarioContent && !codebaseContent)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
              "bg-purple-600 hover:bg-purple-700"
            } ${isBusy || (!scenarioContent && !codebaseContent) ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
            {isGenerating ? "Generating…" : "Create Test Case"}
          </button>
          <button
            type="button"
            onClick={() => void handleSaveAsSubFile()}
            disabled={isBusy || !aiResult.trim()}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
              "bg-emerald-600 hover:bg-emerald-700"
            } ${isBusy || !aiResult.trim() ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSaving ? "Saving…" : "Next"}
            {!isSaving && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </Modal>
  );
}
