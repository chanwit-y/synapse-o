"use client";

import { useState } from "react";
import Image from "next/image";
import LayoutShell from "../../lib/components/LayoutShell";
import MarkdownEditor from "../../lib/components/MarkdownEditor";
import FileSidebar from "../../lib/components/FileSidebar";
import type { TreeNode } from "../../lib/components/TreeView";
import emptyBox from "../../asset/empty-box.svg";

export default function Home() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedFile, setSelectedFile] = useState<TreeNode | null>(null);

  return (
    <LayoutShell
      sidebar={
        <FileSidebar
          collapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed((v) => !v)}
          onSelectFile={(node) => setSelectedFile(node)}
        />
      }
    >
      {selectedFile ? (
        <div className="flex h-full justify-center font-sans p-4">
          <MarkdownEditor selectedFile={selectedFile} />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <Image
            src={emptyBox}
            alt="Empty state"
            width={120}
            height={120}
          />
        </div>
      )}
    </LayoutShell>
  );
}


