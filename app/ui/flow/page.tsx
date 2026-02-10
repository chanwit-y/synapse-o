"use client";
/**
 * @file page.tsx
 * @description Component that displays a codebase tree view visualization using indexed codebase data for navigation and exploration.
 */

import CodebaseTreeView from "@/app/lib/components/CodebaseTreeView";
import codebaseIndexData from "@/app/codebase-index.json";
import type { CodebaseIndex } from "@/app/lib/components/@types/codebaseTreeTypes";

export default function FlowPage() {
  const data = codebaseIndexData as CodebaseIndex;

  return (
    <div className="h-screen p-4">
      <CodebaseTreeView data={data} />
    </div>
  );
}