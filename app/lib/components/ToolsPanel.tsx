"use client";

import { useMemo, useState } from "react";
import { FlaskConical } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import Modal from "./Modal";
import { useLoading } from "./LoadingProvider";
import { useSnackbar } from "./Snackbar";
import { testAI } from "@/app/ui/doc/action";
import MarkdownDisplay from "./MarkdownDisplay";

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
  const defaultUnitTestPrompt = useMemo(
    () => `You are a senior software engineer.

Write high-quality unit tests for the file: ${fileName}
File ID: ${fileId}

Requirements:
- Use the project's existing test framework and conventions.
- Cover happy paths, edge cases, and error handling.
- Mock external dependencies.
- Keep tests readable and maintainable.

Output only the test code.`,
    [fileId, fileName],
  );
  const [unitTestPrompt, setUnitTestPrompt] = useState(defaultUnitTestPrompt);
  const unitTestLoaderId = `unit-test:${fileId}`;
  const isGenerating = activeLoaderIds.includes(unitTestLoaderId);

  const handleCreateUnitTest = () => {
    setUnitTestPrompt(defaultUnitTestPrompt);
    setAiResult("");
    setAiError("");
    setIsUnitTestModalOpen(true);
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
        size="md"
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
              <div className="text-sm font-medium text-gray-600">AI result</div>
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
              disabled={isGenerating}
              className={[
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                theme === "dark"
                  ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300",
                isGenerating ? "opacity-60 cursor-not-allowed" : "",
              ].join(" ")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerateUnitTest}
              disabled={isGenerating}
              className={[
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                "bg-blue-600 text-white hover:bg-blue-700",
                isGenerating ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
              ].join(" ")}
            >
              {isGenerating ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

