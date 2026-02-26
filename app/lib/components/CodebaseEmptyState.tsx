"use client";

import { Code } from "lucide-react";

interface CodebaseEmptyStateProps {
  isDark: boolean;
  hasSearch: boolean;
}

export default function CodebaseEmptyState({ isDark, hasSearch }: CodebaseEmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 ${
        isDark ? "border-gray-700 text-gray-500" : "border-gray-300 text-gray-400"
      }`}
    >
      <Code className="h-12 w-12 mb-4 opacity-40" />
      <p className="text-lg font-medium">
        {hasSearch ? "No codebases match your search" : "No codebases found"}
      </p>
      <p className="text-sm mt-1">
        {hasSearch ? "Try adjusting your search terms." : "Import a codebase to get started."}
      </p>
    </div>
  );
}
