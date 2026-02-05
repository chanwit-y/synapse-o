"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { fileService } from "@/app/lib/services/fileService.client";
import type { Tag } from "@/app/lib/components/@types/tagEditorTypes";
import type { TreeNode } from "@/app/lib/components/@types/treeViewTypes";

type DocWorkspaceState = {
  // Sidebar (Docs file tree) UI state
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;

  // Selected file state
  selectedFile: TreeNode | null;
  selectedFilePath: string | null;
  isLoadingFile: boolean;

  // Drawer UI
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;

  // Icon UI + overrides (optimistic)
  selectedIconId: string;
  iconOverrides: Record<string, string | null>;
  setFileIcon: (fileId: string, iconId: string) => void;

  // Used to force sidebar reload in `FileSidebar` after creating/deleting files.
  sidebarReloadKey: number;
  bumpSidebarReloadKey: () => void;
  resetSidebarReloadKey: () => void;

  // Actions
  clearSelection: () => void;
  selectFile: (node: TreeNode, nodePath: string) => Promise<void>;
  setSelectedFileTags: (tags: Tag[]) => void;
};

function resolveIconId(opts: {
  node: Pick<TreeNode, "id" | "icon">;
  iconOverrides: Record<string, string | null>;
}) {
  const { node, iconOverrides } = opts;
  return iconOverrides[node.id] ?? node.icon ?? "file";
}

export const useDocWorkspaceStore = create<DocWorkspaceState>()(
  persist(
    (set, get) => {
      let activeSelectionRequestId = 0;

      return {
        isSidebarCollapsed: false,
        setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
        toggleSidebarCollapsed: () =>
          set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),

        selectedFile: null,
        selectedFilePath: null,
        isLoadingFile: false,

        isDrawerOpen: false,
        setDrawerOpen: (open) => set({ isDrawerOpen: open }),

        selectedIconId: "file",
        iconOverrides: {},
        setFileIcon: (fileId, iconId) => {
          set((s) => ({
            iconOverrides: { ...s.iconOverrides, [fileId]: iconId },
            selectedIconId:
              s.selectedFile?.id === fileId ? iconId : s.selectedIconId,
            selectedFile:
              s.selectedFile?.id === fileId
                ? ({ ...s.selectedFile, icon: iconId } as TreeNode)
                : s.selectedFile,
          }));

          // Persist icon in the background (optimistic UI).
          void fileService.updateFileIcon(fileId, iconId).catch((err) => {
            console.error("Failed to update file icon:", err);
          });
        },

        sidebarReloadKey: 0,
        bumpSidebarReloadKey: () =>
          set((s) => ({ sidebarReloadKey: s.sidebarReloadKey + 1 })),
        resetSidebarReloadKey: () => set({ sidebarReloadKey: 0 }),

        clearSelection: () =>
          set({
            selectedFile: null,
            selectedFilePath: null,
            selectedIconId: "file",
            isLoadingFile: false,
            isDrawerOpen: false,
          }),

        setSelectedFileTags: (tags) =>
          set((s) => ({
            selectedFile: s.selectedFile ? ({ ...s.selectedFile, tags } as TreeNode) : s.selectedFile,
          })),

        selectFile: async (node, nodePath) => {
          const requestId = ++activeSelectionRequestId;

          // Set initial node data immediately for responsive UI.
          const iconId = resolveIconId({
            node,
            iconOverrides: get().iconOverrides,
          });

          set({
            selectedFile: node,
            selectedFilePath: nodePath,
            selectedIconId: iconId,
            isLoadingFile: true,
          });

          try {
            const fileDetails = await fileService.getFileDetails(node.id);
            if (requestId !== activeSelectionRequestId) return;

            if (fileDetails) {
              const merged: TreeNode = {
                ...(node as TreeNode),
                ...(fileDetails as any),
                icon: (fileDetails as any).icon ?? node.icon,
                tags: (fileDetails as any).tags ?? (node.tags ?? []),
              };

              const resolvedMergedIcon = resolveIconId({
                node: { id: merged.id, icon: merged.icon ?? null },
                iconOverrides: get().iconOverrides,
              });

              set({ selectedFile: merged, selectedIconId: resolvedMergedIcon });
            }
          } catch (error) {
            if (requestId !== activeSelectionRequestId) return;
            console.error("Error fetching file:", error);
            // Keep initial node data if API call fails.
          } finally {
            if (requestId !== activeSelectionRequestId) return;
            set({ isLoadingFile: false });
          }
        },
      };
    },
    {
      name: "doc-workspace",
      version: 1,
      // Only persist user-preferences; do not persist current selection/content.
      partialize: (s) => ({
        isSidebarCollapsed: s.isSidebarCollapsed,
        iconOverrides: s.iconOverrides,
      }),
    },
  ),
);


