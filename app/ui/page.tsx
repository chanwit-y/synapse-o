"use client";

import { useState } from "react";
import LayoutShell from "../lib/components/LayoutShell";
import MarkdownEditor from "../lib/components/MarkdownEditor";
import Sidebar from "../lib/components/Sidebar";

export default function Home() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <LayoutShell
      sidebar={
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed((v) => !v)}
        />
      }
    >
      <div className="flex h-full justify-center font-sans p-4">
        <MarkdownEditor />
      </div>
    </LayoutShell>
  );
}


