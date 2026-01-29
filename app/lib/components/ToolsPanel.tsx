"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import Modal from "./Modal";

interface ToolsPanelProps {
  fileId: string;
  fileName: string;
}

export default function ToolsPanel({ fileId, fileName }: ToolsPanelProps) {
  const { theme } = useTheme();
  const [isUnitTestModalOpen, setIsUnitTestModalOpen] = useState(false);

  const handleCreateUnitTest = () => {
    setIsUnitTestModalOpen(true);
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
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Create Unit Test</h2>
          <p className="text-sm text-gray-500">
            Generate unit tests for: <span className="font-medium">{fileName}</span>
          </p>
          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsUnitTestModalOpen(false)}
              className={[
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                theme === "dark"
                  ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300",
              ].join(" ")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                // TODO: Implement unit test generation
                console.log("Create unit test for:", fileName, "with ID:", fileId);
                setIsUnitTestModalOpen(false);
              }}
              className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Generate
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

