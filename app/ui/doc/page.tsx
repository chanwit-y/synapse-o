"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import LayoutShell from "../../lib/components/LayoutShell";
import MarkdownEditor from "../../lib/components/MarkdownEditor";
import FileSidebar from "../../lib/components/FileSidebar";
import type { TreeNode } from "../../lib/components/TreeView";
import IconPopover from "../../lib/components/IconPopover";
import { iconOptions } from "../../lib/components/iconOptions";
import emptyBox from "../../asset/empty-box.svg";

const updateFileIconClient = async (fileId: string, icon: string | null) => {
  await fetch("/api/file/icon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: fileId, icon }),
  });
};

export default function Home() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedFile, setSelectedFile] = useState<TreeNode | null>(null);
  const [selectedIconId, setSelectedIconId] = useState("file");
  const [iconOverrides, setIconOverrides] = useState<Record<string, string | null>>({});
  const [, startTransition] = useTransition();

  const handleIconChange = (iconId: string) => {
    setSelectedIconId(iconId);
    if (!selectedFile) return;
    setIconOverrides((prev) => ({ ...prev, [selectedFile.id]: iconId }));
    setSelectedFile((prev) => (prev ? { ...prev, icon: iconId } : prev));
    startTransition(() => {
      void updateFileIconClient(selectedFile.id, iconId);
    });
  };

  return (
    // <LayoutShell>
      <>
        <FileSidebar
          collapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed((v) => !v)}
          iconOverrides={iconOverrides}
          onSelectFile={(node) => {
            setSelectedFile(node);
            const resolvedIcon = iconOverrides[node.id] ?? node.icon ?? "file";
            setSelectedIconId(resolvedIcon);
          }}
        />
        <main className="flex-1 w-dvw overflow-auto animate-fade-in">
          {selectedFile ? (
            <>
              <div className="flex items-center gap-1 pt-6 pl-6 text-2xl font-bold text-gray-300">
                <IconPopover
                  value={selectedIconId}
                  options={iconOptions}
                  onChange={handleIconChange}
                  ariaLabel="Change file icon"
                />
                <span className="">{selectedFile.name}</span>
              </div>
              <div
                key={selectedFile.id}
                className="flex  justify-center font-sans px-4 py-2 markdown-fade-in"
              >
                <MarkdownEditor selectedFile={selectedFile} />
              </div>
            </>
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
        </main>
      </>
    // </LayoutShell>
  );
}


