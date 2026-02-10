"use client";
/**
 * @file page.tsx
 * @description Markdown workspace component featuring a file sidebar for navigation, markdown editor, icon and tag editors, and a properties drawer for file metadata management.
 */

import { useEffect } from "react";
import { PanelRightOpen } from "lucide-react";
import Image from "next/image";
import MarkdownEditor from "../../lib/components/MarkdownEditor";
import FileSidebar from "../../lib/components/FileSidebar";
import type { TreeNode } from "../../lib/components/@types/treeViewTypes";
import IconPopover from "../../lib/components/IconPopover";
import { iconOptions } from "../../lib/components/iconOptions";
import Drawer from "../../lib/components/Drawer";
import TagEditor from "../../lib/components/TagEditor";
import ToolsPanel from "../../lib/components/ToolsPanel";
import { useTheme } from "../../lib/components/ThemeProvider";
import emptyBox from "../../asset/empty-box.svg";
import { useDocWorkspaceStore } from "@/app/lib/stores/docWorkspaceStore";

export default function Home() {
  const { theme } = useTheme();

  const isSidebarCollapsed = useDocWorkspaceStore((s) => s.isSidebarCollapsed);
  const toggleSidebarCollapsed = useDocWorkspaceStore((s) => s.toggleSidebarCollapsed);
  const selectedFile = useDocWorkspaceStore((s) => s.selectedFile) as TreeNode | null;
  const selectedFilePath = useDocWorkspaceStore((s) => s.selectedFilePath);
  const selectedIconId = useDocWorkspaceStore((s) => s.selectedIconId);
  const iconOverrides = useDocWorkspaceStore((s) => s.iconOverrides);
  const isDrawerOpen = useDocWorkspaceStore((s) => s.isDrawerOpen);
  const setDrawerOpen = useDocWorkspaceStore((s) => s.setDrawerOpen);
  const sidebarReloadKey = useDocWorkspaceStore((s) => s.sidebarReloadKey);
  const bumpSidebarReloadKey = useDocWorkspaceStore((s) => s.bumpSidebarReloadKey);
  const clearSelection = useDocWorkspaceStore((s) => s.clearSelection);
  const selectFile = useDocWorkspaceStore((s) => s.selectFile);
  const setFileIcon = useDocWorkspaceStore((s) => s.setFileIcon);
  const setSelectedFileTags = useDocWorkspaceStore((s) => s.setSelectedFileTags);

  useEffect(() => {
    // Close the Properties drawer after collection data is reloaded.
    // Skip initial mount (sidebarReloadKey starts at 0).
    if (sidebarReloadKey <= 0) return;
    setDrawerOpen(false);
  }, [sidebarReloadKey, setDrawerOpen]);

  const handleIconChange = (iconId: string) => {
    if (!selectedFile) return;
    setFileIcon(selectedFile.id, iconId);
  };

  return (
    // <LayoutShell>
    <>
      <FileSidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
        iconOverrides={iconOverrides}
        onSelectFile={selectFile}
        onClearSelection={clearSelection}
        reloadKey={sidebarReloadKey}
        selectedNodePath={selectedFilePath}
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
                onClick={() => setDrawerOpen(true)}
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
              onClose={() => setDrawerOpen(false)}
              position="right"
              title="Properties"
            >
              <TagEditor 
                fileId={selectedFile.id} 
                fileTags={(selectedFile.tags ?? [])} 
                onTagsChange={(newTags) => {
                  setSelectedFileTags(newTags);
                }}
              />
              
              <div className="mt-6">
                <ToolsPanel
                  fileId={selectedFile.id}
                  fileName={selectedFile.name}
                  collectionId={selectedFile.collectionId}
                  selectedFilePath={selectedFilePath}
                  onAfterCreateTestCaseFile={({ node, nodePath }) => {
                    bumpSidebarReloadKey();
                    void selectFile(node, nodePath);
                  }}
                />
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


