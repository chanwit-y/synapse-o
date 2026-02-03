"use client";

import { useMemo, useState } from "react";
import { Copy, FlaskConical } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import Modal from "./Modal";
import { useLoading } from "./LoadingProvider";
import { useSnackbar } from "./Snackbar";
import { testAI } from "@/app/ui/doc/action";
import MarkdownDisplay from "./MarkdownDisplay";
import { fileService } from "@/app/lib/services/fileService";

interface ToolsPanelProps {
  fileId: string;
  fileName: string;
}

export default function ToolsPanel({ fileId, fileName }: ToolsPanelProps) {
  const { theme } = useTheme();
  const { withLoading, activeLoaderIds } = useLoading();
  const { showSnackbar } = useSnackbar();
  const [isUnitTestModalOpen, setIsUnitTestModalOpen] = useState(false);
  const [aiResult, setAiResult] = useState<string>("");
  const [aiError, setAiError] = useState<string>("");
  const [isCopying, setIsCopying] = useState(false);
  const MAX_CONTEXT_CHARS = 12000;
  const defaultUnitTestPrompt = useMemo(() => {
    // This base prompt is used immediately when opening the modal.
    // We then enrich it with the current file content loaded by `fileId`.
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

3. Format: Output the test cases in a Markdown Table with the following columns:
* TC_ID (e.g., TC001)
* Type (Positive/Negative/Edge)
* Scenario Description
* Pre-conditions
* Test Steps (Clear, numbered actions)
* Test Data (Specific inputs to use)
* Expected Result
* Priority (P1-Critical, P2-High, P3-Medium)

Constraints:

* Ensure steps are atomic and reproducible.
* Do not assume knowledge that isn't in the requirement; if you must assume, note it.
* Keep the tone professional and technical.`;
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

1. Analyze the Requirement: briefly identify any logical gaps or ambiguity in the feature description before writing the cases.
2. Coverage: You must include:
* Positive Test Cases (Happy Path)
* Negative Test Cases (Error handling, invalid inputs)
* Boundary/Edge Cases (Min/max limits, empty states, special characters)
* Security/Performance (If applicable to the context)

3. Format: Output the test cases in a Markdown Table with the following columns:
* TC_ID (e.g., TC001)
* Type (Positive/Negative/Edge)
* Scenario Description
* Pre-conditions
* Test Steps (Clear, numbered actions)
* Test Data (Specific inputs to use)
* Expected Result
* Priority (P1-Critical, P2-High, P3-Medium)

Constraints:

* Ensure steps are atomic and reproducible.
* Do not assume knowledge that isn't in the requirement; if you must assume, note it.
* Keep the tone professional and technical.`;
  };

  const [unitTestPrompt, setUnitTestPrompt] = useState(defaultUnitTestPrompt);
  const unitTestLoaderId = `unit-test:${fileId}`;
  const unitTestContextLoaderId = `unit-test-context:${fileId}`;
  const isGenerating = activeLoaderIds.includes(unitTestLoaderId);
  const isPreparingContext = activeLoaderIds.includes(unitTestContextLoaderId);
  const isBusy = isGenerating || isPreparingContext;

  const handleCreateUnitTest = async () => {
    setAiResult("");
    setAiError("");
    setIsUnitTestModalOpen(true);

    // Start with the base prompt immediately, then enrich with current file content.
    setUnitTestPrompt(defaultUnitTestPrompt);

    try {
      await withLoading(async () => {
        const content = await fileService.loadFile(fileId);
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

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Tools
      </div>
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

      <Modal
        isOpen={isUnitTestModalOpen}
        onClose={() => setIsUnitTestModalOpen(false)}
        size="xl"
      >
        <div className="flex max-h-[75vh] flex-col">
          {/* Scrollable body */}
          <div className="space-y-4 overflow-auto pr-1 pb-4">
            <h2 className="text-lg font-semibold">Create Unit Test</h2>
            <p className="text-sm text-gray-500">
              Generate unit tests for: <span className="font-medium">{fileName}</span>
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
                  <MarkdownDisplay
                    content={aiResult}
                    theme={theme}
                    className="markdown-fade-in"
                    animate={{ enabled: true, intervalMs: 10, chunkSize: 8 }}
                  />
                ) : (
                  <div className={theme === "dark" ? "text-gray-400 text-sm" : "text-gray-500 text-sm"}>
                    Click “Generate” to see the markdown response here.
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
    </div>
  );
}

