"use client";

import { useState, useTransition } from "react";
import { PanelRightOpen } from "lucide-react";
import Image from "next/image";
import MarkdownEditor from "../../lib/components/MarkdownEditor";
import FileSidebar from "../../lib/components/FileSidebar";
import type { TreeNode } from "../../lib/components/TreeView";
import IconPopover from "../../lib/components/IconPopover";
import { iconOptions } from "../../lib/components/iconOptions";
import Drawer from "../../lib/components/Drawer";
import TagEditor from "../../lib/components/TagEditor";
import ToolsPanel from "../../lib/components/ToolsPanel";
import { useTheme } from "../../lib/components/ThemeProvider";
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const { theme } = useTheme();
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

  const handleSelectFile = async (node: TreeNode) => {
    // Set the initial node data immediately for responsive UI
    setSelectedFile(node);
    const resolvedIcon = iconOverrides[node.id] ?? node.icon ?? "file";
    setSelectedIconId(resolvedIcon);

    // Fetch the full file data from the API
    setIsLoadingFile(true);
    try {
      const response = await fetch(`/api/file?id=${encodeURIComponent(node.id)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch file");
      }
      const data = await response.json();
      if (data.success && data.file) {
        // Merge the fetched file data with the node data
        setSelectedFile({
          ...node,
          ...data.file,
          icon: data.file.icon ?? node.icon,
          tags: data.file.tags ?? [],
        });
      }
    } catch (error) {
      console.error("Error fetching file:", error);
      // Keep the initial node data if API call fails
    } finally {
      setIsLoadingFile(false);
    }
  };

  return (
    // <LayoutShell>
    <>
      <FileSidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed((v) => !v)}
        iconOverrides={iconOverrides}
        onSelectFile={handleSelectFile}
      />
      <main className="flex-1 w-dvw overflow-auto animate-fade-in">
        {selectedFile ? (
          <>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 pt-6 pl-6 text-2xl font-bold text-gray-300">
                <IconPopover
                  value={selectedIconId}
                  options={iconOptions}
                  onChange={handleIconChange}
                  ariaLabel="Change file icon"
                />
                <span className="">{selectedFile.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className={[
                  "mr-6 mt-6 flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer",
                  theme === "dark"
                    ? "text-gray-300 hover:bg-gray-700"
                    : "text-gray-600 hover:bg-gray-100",
                ].join(" ")}
                aria-label="Open drawer"
              >
                <PanelRightOpen className="h-5 w-5" />
              </button>
            </div>
            <Drawer
              isOpen={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              position="right"
              title="Properties"
            >
              <TagEditor fileId={selectedFile.id} fileTags={(selectedFile.tags ?? [])} />
              
              <div className="mt-6">
                <ToolsPanel fileId={selectedFile.id} fileName={selectedFile.name} />
              </div>
            </Drawer>
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


