"use client";

import LayoutShell from "../lib/components/LayoutShell";
import MarkdownEditor from "../lib/components/MarkdownEditor";

export default function Home() {
  return (
    <LayoutShell>
      <div className="flex h-full justify-center font-sans p-4">
        <MarkdownEditor />
      </div>
    </LayoutShell>
  );
}


