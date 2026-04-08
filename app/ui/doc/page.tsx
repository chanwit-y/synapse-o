"use client";
/**
 * @file page.tsx
 * @description Markdown workspace component featuring a file sidebar for navigation, markdown editor, icon and tag editors, and a properties drawer for file metadata management.
 */

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowLeftRight, Languages, Loader2, PanelRightOpen } from "lucide-react";
import Image from "next/image";
import MarkdownEditor from "../../lib/components/MarkdownEditor";
import DataTable from "../../lib/components/DataTable";
import FlowCanvas from "../../lib/components/FlowCanvas";
import FileSidebar from "../../lib/components/FileSidebar";
import type { TreeNode } from "../../lib/components/@types/treeViewTypes";
import IconPopover from "../../lib/components/IconPopover";
import { iconOptions } from "../../lib/components/iconOptions";
import Drawer from "../../lib/components/Drawer";
import TagEditor from "../../lib/components/TagEditor";
import ToolsPanel from "../../lib/components/ToolsPanel";
import SubFileList from "../../lib/components/SubFileList";
import { getParentFile, getSubFilesByFileId, type SubFileEntry } from "@/app/ui/doc/action";
import { useTheme } from "../../lib/components/ThemeProvider";
import { useSnackbar } from "../../lib/components/Snackbar";
import emptyBox from "../../asset/empty-box.svg";
import { useDocWorkspaceStore } from "@/app/lib/stores/docWorkspaceStore";
import { useTranslateFileMutation, useFileContentQuery } from "@/app/lib/services/fileService.client";

export default function Home() {
  const { theme } = useTheme();

  const isSidebarCollapsed = useDocWorkspaceStore((s) => s.isSidebarCollapsed);
  const toggleSidebarCollapsed = useDocWorkspaceStore((s) => s.toggleSidebarCollapsed);
  const sidebarWidth = useDocWorkspaceStore((s) => s.sidebarWidth);
  const setSidebarWidth = useDocWorkspaceStore((s) => s.setSidebarWidth);
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
  const selectSubFile = useDocWorkspaceStore((s) => s.selectSubFile);
  const parentFile = useDocWorkspaceStore((s) => s.parentFile);
  const setParentFile = useDocWorkspaceStore((s) => s.setParentFile);
  const goBackToParent = useDocWorkspaceStore((s) => s.goBackToParent);
  const setFileIcon = useDocWorkspaceStore((s) => s.setFileIcon);
  const setSelectedFileTags = useDocWorkspaceStore((s) => s.setSelectedFileTags);

  const { showSnackbar } = useSnackbar();
  const translateMutation = useTranslateFileMutation();
  const { data: fileContent } = useFileContentQuery(selectedFile?.id);
  const [activeLang, setActiveLang] = useState<"en" | "th">("en");

  const hasThaiContent = Boolean(selectedFile?.contentTH?.trim());
  const [hasScenarioSubFile, setHasScenarioSubFile] = useState(false);
  const [hasCodebaseSubFile, setHasCodebaseSubFile] = useState(false);

  useEffect(() => {
    setActiveLang("en");
  }, [selectedFile?.id]);

  useEffect(() => {
    if (!selectedFile?.id) {
      setHasScenarioSubFile(false);
      setHasCodebaseSubFile(false);
      return;
    }
    let cancelled = false;
    getSubFilesByFileId(selectedFile.id).then((entries) => {
      if (cancelled) return;
      setHasScenarioSubFile(
        entries.some((e) => e.extension === "scenario" || (e.fileName?.includes(".scenario") ?? false))
      );
      setHasCodebaseSubFile(
        entries.some((e) => e.extension === "codebase" || (e.fileName?.includes(".codebase") ?? false))
      );
    });
    return () => { cancelled = true; };
  }, [selectedFile?.id, sidebarReloadKey]);

  useEffect(() => {
    if (!selectedFile?.id || parentFile) return;
    let cancelled = false;
    getParentFile(selectedFile.id).then((info) => {
      if (cancelled || !info) return;
      const parentNode: TreeNode = {
        id: info.parentFileId,
        collectionId: info.parentCollectionId,
        name: info.parentFileName,
        type: "file",
        icon: info.parentIcon,
        extension: info.parentExtension,
        tags: info.parentTags,
      };
      setParentFile(parentNode, info.parentFileName);
    });
    return () => { cancelled = true; };
  }, [selectedFile?.id, parentFile, setParentFile]);

  const handleTranslate = async () => {
    if (!selectedFile) return;
    const content = fileContent ?? selectedFile.content ?? "";
    if (!content.trim()) {
      showSnackbar({ message: "No content to translate", variant: "error" });
      return;
    }
    try {
      const translated = await translateMutation.mutateAsync({
        fileId: selectedFile.id,
        markdown: content,
      });
      useDocWorkspaceStore.setState((s) => ({
        selectedFile: s.selectedFile
          ? { ...s.selectedFile, contentTH: translated }
          : s.selectedFile,
      }));
      showSnackbar({ message: "Translated and saved successfully", variant: "success" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Translation failed";
      showSnackbar({ message: msg, variant: "error" });
    }
  };

  const editorFile = useMemo(() => {
    if (!selectedFile || activeLang === "en") return selectedFile;
    return { ...selectedFile, content: selectedFile.contentTH ?? "" } as TreeNode;
  }, [selectedFile, activeLang]);

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

  const handleSelectSubFile = (entry: SubFileEntry) => {
    const node: TreeNode = {
      id: entry.contentFileId,
      collectionId: entry.collectionId ?? "",
      name: entry.fileName ?? "Untitled",
      type: "file",
      icon: entry.icon,
      extension: entry.extension,
      tags: entry.tags,
    };
    void selectSubFile(node, entry.fileName ?? "");
  };

  return (
    // <LayoutShell>
    <>
      <FileSidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
        iconOverrides={iconOverrides}
        onSelectFile={selectFile}
        onClearSelection={clearSelection}
        reloadKey={sidebarReloadKey}
        selectedNodePath={selectedFilePath}
        selectedNodeId={selectedFile?.id ?? null}
      />
      <main className="flex-1 w-dvw overflow-auto animate-fade-in">
        {selectedFile ? (
          <>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 pt-6 pl-6 text-2xl font-bold text-gray-300">
                {parentFile && (
                  <button
                    type="button"
                    onClick={() => void goBackToParent()}
                    className={[
                      "flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer mr-1",
                      theme === "dark"
                        ? "text-gray-300 hover:bg-gray-700"
                        : "text-gray-600 hover:bg-gray-100",
                    ].join(" ")}
                    aria-label={`Back to ${parentFile.name}`}
                    title={`Back to ${parentFile.name}`}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <IconPopover
                  value={selectedIconId}
                  options={iconOptions}
                  onChange={handleIconChange}
                  ariaLabel="Change file icon"
                />
                <span className="">{selectedFile.name}</span>
              </div>
<div className="flex items-center gap-2">
              {hasThaiContent ? (
                <button
                  type="button"
                  onClick={() => setActiveLang((l) => (l === "en" ? "th" : "en"))}
                  className={[
                    "mr-0 mt-6 flex h-8 items-center gap-1 px-2 rounded-md transition-colors cursor-pointer text-xs font-medium",
                    theme === "dark"
                      ? "text-gray-300 hover:bg-gray-700"
                      : "text-gray-600 hover:bg-gray-100",
                  ].join(" ")}
                  aria-label="Switch language"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  <span>{activeLang === "en" ? "EN" : "TH"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleTranslate}
                  disabled={translateMutation.isPending}
                  className={[
                    "mr-0 mt-6 flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                    translateMutation.isPending ? "opacity-50 cursor-wait" : "cursor-pointer",
                    theme === "dark"
                      ? "text-gray-300 hover:bg-gray-700"
                      : "text-gray-600 hover:bg-gray-100",
                  ].join(" ")}
                  aria-label="Translate"
                >
                  {translateMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Languages className="h-5 w-5" />
                  )}
                </button>
              )}
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

            </div>
            <Drawer
              open={isDrawerOpen}
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
                  disableScenario={hasScenarioSubFile}
                  disableCodebase={hasCodebaseSubFile}
                  onAfterCreateTestCaseFile={({ node, nodePath }) => {
                    bumpSidebarReloadKey();
                    void selectFile(node, nodePath);
                  }}
                  onAfterCreateSubFile={bumpSidebarReloadKey}
                />
              </div>

              <div className="mt-6">
                <SubFileList
                  fileId={selectedFile.id}
                  reloadKey={sidebarReloadKey}
                  onSelectSubFile={handleSelectSubFile}
                />
              </div>
            </Drawer>
            <div
              key={`${selectedFile.id}-${activeLang}`}
              className="flex justify-center font-sans px-4 py-2 markdown-fade-in"
            >
              {selectedFile.extension === "flow" || selectedFile.name.endsWith(".flow") ? (
                <FlowCanvas selectedFile={selectedFile} />
              ) : selectedFile.extension === "datatable" || selectedFile.name.endsWith(".datatable") ? (
                <DataTable selectedFile={selectedFile} />
              ) : (
                <MarkdownEditor selectedFile={editorFile} disableContentQuery={activeLang === "th"} />
              )}
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


