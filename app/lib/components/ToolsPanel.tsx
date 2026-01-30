"use client";

import { useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import Modal from "./Modal";
import { useLoading } from "./LoadingProvider";

interface ToolsPanelProps {
  fileId: string;
  fileName: string;
}

export default function ToolsPanel({ fileId, fileName }: ToolsPanelProps) {
  const { theme } = useTheme();
  const { withLoading } = useLoading();
  const [isUnitTestModalOpen, setIsUnitTestModalOpen] = useState(false);
  const [isGeneratingUnitTest, setIsGeneratingUnitTest] = useState(false);
  const defaultUnitTestPrompt = `You are a senior software engineer.

Write high-quality unit tests for the file: ${fileName}
File ID: ${fileId}

Requirements:
- Use the project's existing test framework and conventions.
- Cover happy paths, edge cases, and error handling.
- Mock external dependencies.
- Keep tests readable and maintainable.

Output only the test code.`;
  const [unitTestPrompt, setUnitTestPrompt] = useState(defaultUnitTestPrompt);

  const handleCreateUnitTest = () => {
    setUnitTestPrompt(defaultUnitTestPrompt);
    setIsUnitTestModalOpen(true);
  };

  const handleGenerateUnitTest = async () => {
    if (isGeneratingUnitTest) return;
    setIsGeneratingUnitTest(true);
    try {
      await withLoading(async () => {
        // TODO: Implement unit test generation
        console.log(
          "Create unit test for:",
          fileName,
          "with ID:",
          fileId,
          "prompt:",
          unitTestPrompt,
        );
      }, `unit-test:${fileId}`);
      setIsUnitTestModalOpen(false);
    } finally {
      setIsGeneratingUnitTest(false);
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
        onClose={() => {
          if (isGeneratingUnitTest) return;
          setIsUnitTestModalOpen(false);
        }}
        size="md"
      >
        <div className="space-y-4">
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
              disabled={isGeneratingUnitTest}
              className={[
                "w-full rounded-md border px-3 py-2 text-sm leading-5",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/40",
                isGeneratingUnitTest ? "opacity-60 cursor-not-allowed" : "",
                theme === "dark"
                  ? "border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-500"
                  : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400",
              ].join(" ")}
            />
            <p className="text-xs text-gray-400">
              You can edit this prompt before generating tests.
            </p>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsUnitTestModalOpen(false)}
              disabled={isGeneratingUnitTest}
              className={[
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                isGeneratingUnitTest ? "opacity-60 cursor-not-allowed" : "",
                theme === "dark"
                  ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300",
              ].join(" ")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerateUnitTest}
              disabled={isGeneratingUnitTest}
              aria-busy={isGeneratingUnitTest}
              className={[
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                "bg-blue-600 text-white hover:bg-blue-700",
                isGeneratingUnitTest ? "opacity-70 cursor-not-allowed" : "cursor-pointer",
                "inline-flex items-center gap-2",
              ].join(" ")}
            >
              {isGeneratingUnitTest ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Generating…
                </>
              ) : (
                "Generate"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

