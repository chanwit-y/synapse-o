"use client";

import { FlaskConical } from "lucide-react";
import { useTheme } from "./ThemeProvider";

interface ToolsPanelProps {
  fileId: string;
  fileName: string;
}

export default function ToolsPanel({ fileId, fileName }: ToolsPanelProps) {
  const { theme } = useTheme();

  const handleCreateUnitTest = () => {
    // TODO: Implement unit test generation
    console.log("Create unit test for:", fileName, "with ID:", fileId);
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
    </div>
  );
}

