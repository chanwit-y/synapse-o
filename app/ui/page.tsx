"use client";

import { useState } from "react";
import LayoutShell from "../lib/components/LayoutShell";
import MarkdownEditor from "../lib/components/MarkdownEditor";
import Sidebar from "../lib/components/Sidebar";
import type { TreeNode } from "../lib/components/TreeView";

export default function Home() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedFile, setSelectedFile] = useState<TreeNode | null>(null);

  return (
    <LayoutShell
      sidebar={
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed((v) => !v)}
          onSelectFile={(node) => setSelectedFile(node)}
        />
      }
    >
      <div className="flex h-full justify-center font-sans p-4">
        <MarkdownEditor selectedFile={selectedFile} />
      </div>
    </LayoutShell>
  );
}


