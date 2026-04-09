"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "@/app/lib/components/Modal";
import { useTheme } from "./ThemeProvider";
import { Code, Loader2, Copy, Check } from "lucide-react";
import {
  getSubFilesByFileId,
} from "@/app/ui/doc/action";
import { fileService } from "@/app/lib/services/fileService.client";
import MarkdownDisplay from "./MarkdownDisplay";
import { useLoading } from "./LoadingProvider";
import { useSnackbar } from "./Snackbar";

interface CreateE2eModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  collectionId: string;
  selectedFilePath: string | null;
  onAfterCreateSubFile?: () => void;
  onBusyChange?: (busy: boolean) => void;
}

const MAX_CONTEXT_CHARS = 12000;

const SYSTEM_PROMPT = `From the Test Cases below, generate Playwright E2E tests.

Rules:
- Use TypeScript
- Use Page Object Model — separate page objects from test files
- Use ONLY the selectors specified in the test cases, never guess
- Every test must be independent — no test should depend on another
- Group tests with test.describe by feature/category
- Use meaningful test names that describe the behavior being verified
- Use beforeEach/afterEach for setup/teardown
- Mock APIs using page.route() with the exact endpoints
  and responses from the test cases
- Wait for elements using Playwright's built-in auto-waiting
  locators — never use waitForTimeout or hardcoded delays
- Assert using Playwright's expect API
  (toBeVisible, toHaveText, toHaveURL, toBeDisabled, etc.)
- Include error handling assertions (toast messages,
  inline errors, redirects on failure)

File structure:
tests/
  pages/
    [feature].page.ts      ← page object with selectors & actions
  [feature].spec.ts        ← test file
  fixtures/
    [feature].data.ts      ← test data constants`;

function truncate(text: string | null, max: number): string {
  if (!text) return "";
  const normalized = text.replace(/\r\n/g, "\n");
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}\n\n/* ... truncated: content exceeded ${max} characters ... */\n`;
}

export default function CreateE2eModal({
  isOpen,
  onClose,
  fileId,
  fileName,
  collectionId,
  selectedFilePath,
  onAfterCreateSubFile,
  onBusyChange,
}: CreateE2eModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { withLoading, activeLoaderIds } = useLoading();
  const { showSnackbar } = useSnackbar();

  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [testcaseContent, setTestcaseContent] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState("");
  const [aiError, setAiError] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const generateLoaderId = `e2e-gen:${fileId}`;
  const isGenerating = activeLoaderIds.includes(generateLoaderId);
  const isBusy = isGenerating || isLoadingContext;

  const loadSubFileContents = useCallback(async () => {
    if (!fileId?.trim()) return;
    setIsLoadingContext(true);
    setTestcaseContent(null);

    try {
      const entries = await getSubFilesByFileId(fileId);

      const testcaseEntry = entries.find(
        (e) => e.extension === "testcase" || (e.fileName?.includes(".testcase") ?? false),
      );

      const testcaseText = testcaseEntry
        ? await fileService.loadFile(testcaseEntry.contentFileId)
        : null;

      setTestcaseContent(testcaseText);
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
    const testcase = truncate(testcaseContent, MAX_CONTEXT_CHARS);

    return `${SYSTEM_PROMPT}

Test Cases:
"""
${testcase || "(no .testcase file available)"}
"""`;
  };

  const handleGenerate = async () => {
    if (!testcaseContent) {
      showSnackbar({
        variant: "warning",
        title: "Create E2E",
        message: "No .testcase content found. Please create it first.",
      });
      return;
    }

    if (!collectionId?.trim()) {
      showSnackbar({
        variant: "error",
        title: "Create E2E",
        message: "Missing collectionId for the selected file.",
      });
      return;
    }

    onClose();
    onBusyChange?.(true);
    showSnackbar({
      variant: "info",
      title: "Create E2E",
      message: "Generating E2E tests in background…",
    });

    try {
      const prompt = buildPrompt();

      const response = await fetch("/api/ai/e2e", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: "gpt-5-codex",
          fileId,
          fileName,
          collectionId,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Failed to generate E2E tests.");
      }

      const data = await response.json();
      const content = ((data.result as string) ?? "").trim();

      if (!content) {
        showSnackbar({
          variant: "warning",
          title: "Create E2E",
          message: "AI returned empty result.",
        });
        return;
      }

      onAfterCreateSubFile?.();

      showSnackbar({
        variant: "success",
        title: "Create E2E",
        message: "E2E test code generated and saved as a sub-file.",
      });
    } catch (error) {
      console.error("E2E generation failed:", error);
      const message = error instanceof Error ? error.message : "Failed to generate E2E tests.";
      setAiError(message);
      showSnackbar({ variant: "error", title: "Create E2E", message });
    } finally {
      onBusyChange?.(false);
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
            <Code className="h-5 w-5 text-cyan-500" />
            <h2 className="text-xl font-semibold">Create E2E</h2>
          </div>

          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Generate Playwright E2E test code for{" "}
            <span className="font-medium">{fileName}</span> using .testcase context.
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
              <div
                className={`rounded-lg border p-3 ${
                  isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                      isDark ? "bg-purple-900/40 text-purple-300" : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    .testcase
                  </span>
                  {testcaseContent && (
                    <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      {testcaseContent.length.toLocaleString()} chars
                    </span>
                  )}
                </div>
                {testcaseContent ? (
                  <div className="max-h-48 overflow-auto">
                    <MarkdownDisplay content={testcaseContent} theme={theme} animate={{ enabled: false }} />
                  </div>
                ) : (
                  <p className={`text-sm italic ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    No .testcase file found.
                  </p>
                )}
              </div>

              {(aiResult || aiError) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Generated E2E Code
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
            disabled={isBusy || !testcaseContent}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
              "bg-cyan-600 hover:bg-cyan-700"
            } ${isBusy || !testcaseContent ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
            {isGenerating ? "Generating…" : "Generate E2E"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
