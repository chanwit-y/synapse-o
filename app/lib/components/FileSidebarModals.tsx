"use client";
/**
 * @file FileSidebarModals.tsx
 * @description Modal dialogs for managing file/folder collections including add collection, add item, and delete confirmation modals.
 */

import Modal from "./Modal";
import type { TreeNode } from "./@types/treeViewTypes";
import { ChevronDown, ChevronRight, Crown, Trophy, BookOpen, ClipboardCheck } from "lucide-react";
import { useMemo, useState } from "react";

type SelectedNodeForAdd =
  | { node: TreeNode | null; path: string | null; groupIndex: number }
  | null;

type SelectedNodeForDelete =
  | { node: TreeNode; path: string; groupIndex: number }
  | null;

type FileFormat = "md" | "datatable";

type BacklogNode = {
  id: number;
  title: string;
  state: string;
  workItemType: string;
  children: BacklogNode[];
};

/** Work item types shown in the Azure DevOps backlog modal. */
const VISIBLE_AZURE_BACKLOG_TYPES = new Set<string>(["Epic", "Feature", "User Story"]);

/**
 * Keeps only Epic, Feature, and User Story nodes. Other types are omitted; their
 * descendants that match visible types are preserved (re-parented to the same level).
 */
function filterBacklogToVisibleTypes(nodes: BacklogNode[]): BacklogNode[] {
  const out: BacklogNode[] = [];
  for (const n of nodes) {
    const filteredChildren = filterBacklogToVisibleTypes(n.children ?? []);
    if (VISIBLE_AZURE_BACKLOG_TYPES.has(n.workItemType)) {
      out.push({ ...n, children: filteredChildren });
    } else {
      out.push(...filteredChildren);
    }
  }
  return out;
}

function BacklogTree({
  theme,
  nodes,
  isLoading,
}: {
  theme: string;
  nodes: BacklogNode[];
  isLoading: boolean;
}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const rootOrderById = useMemo(() => {
    const map = new Map<number, number>();
    nodes.forEach((n, idx) => map.set(n.id, idx + 1));
    return map;
  }, [nodes]);

  const rows = useMemo(() => {
    const out: Array<{ node: BacklogNode; level: number }> = [];
    const walk = (items: BacklogNode[], level: number) => {
      for (const n of items) {
        out.push({ node: n, level });
        if (expanded[n.id] && n.children?.length) {
          walk(n.children, level + 1);
        }
      }
    };
    walk(nodes, 0);
    return out;
  }, [nodes, expanded]);

  const toggle = (id: number) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const typeIcon = (t: string) => {
    switch (t) {
      case "Epic":
        return <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "Feature":
        return <Trophy className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case "User Story":
        return <BookOpen className="h-4 w-4 text-sky-600 dark:text-sky-400" />;
      case "Task":
        return <ClipboardCheck className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className={theme === "light" ? "p-4 text-sm text-gray-600" : "p-4 text-sm text-gray-400"}>
        Loading backlog…
      </div>
    );
  }

  return (
    <table className="w-full text-sm table-fixed">
      <thead className={(theme === "light" ? "bg-gray-50" : "bg-gray-800") + " sticky top-0 z-10"}>
        <tr>
          <th className="px-3 py-2 text-left font-medium w-10">
            <div className="flex items-center gap-1">
              <span>Order</span>
            </div>
          </th>
          <th className="px-3 py-2 text-left font-medium w-20">Work Item Type</th>
          <th className="px-3 py-2 text-left font-medium w-3/4">Title</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ node, level }) => {
          const hasChildren = (node.children?.length ?? 0) > 0;
          const isOpen = Boolean(expanded[node.id]);
          return (
            <tr
              key={node.id}
              className={theme === "light" ? "border-t border-gray-100 hover:bg-gray-50" : "border-t border-gray-700 hover:bg-gray-800/50"}
              onClick={() => {
                if (hasChildren) toggle(node.id);
              }}
            >
              <td className="px-3 py-2 font-mono text-xs text-gray-500">
                {level === 0 ? rootOrderById.get(node.id) ?? "" : ""}
              </td>
              <td className="px-3 py-2">
                <div style={{ paddingLeft: `${level * 16}px` }}>
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(node.id);
                      }}
                      className={theme === "light" ? "text-gray-700 hover:text-gray-900" : "text-gray-300 hover:text-gray-100"}
                      aria-label={isOpen ? "Collapse" : "Expand"}
                      title={isOpen ? "Collapse" : "Expand"}
                    >
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                  <span className="whitespace-nowrap">{node.workItemType}</span>
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex w-4 justify-center shrink-0">{typeIcon(node.workItemType)}</span>
                  <span className="truncate block">{node.title}</span>
                </div>
              </td>
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={3} className={theme === "light" ? "px-3 py-4 text-center text-gray-500" : "px-3 py-4 text-center text-gray-400"}>
              No items
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

type FileSidebarModalsProps = {
  theme: string;
  isCollectionModalOpen: boolean;
  onCloseCollectionModal: () => void;
  collectionName: string;
  onChangeCollectionName: (value: string) => void;
  onSubmitCollection: () => void;
  isSavingCollection: boolean;
  isAddItemModalOpen: boolean;
  onCloseAddItemModal: () => void;
  itemType: "file" | "folder";
  itemName: string;
  onChangeItemName: (value: string) => void;
  fileFormat: FileFormat;
  onSubmitItem: () => void;
  isSavingItem: boolean;
  selectedNodeForAdd: SelectedNodeForAdd;
  isAzureDevopsModalOpen: boolean;
  onCloseAzureDevopsModal: () => void;
  azureProjects: { id: string; name: string }[];
  selectedAzureProject: string;
  onChangeSelectedAzureProject: (project: string) => void;
  azureBacklog: BacklogNode[];
  isLoadingAzureProjects: boolean;
  isLoadingAzureBacklog: boolean;
  isImportAzureModalOpen: boolean;
  onCloseImportAzureModal: () => void;
  azureMarkdownUrl: string;
  onChangeAzureMarkdownUrl: (value: string) => void;
  azureMarkdownName: string;
  onChangeAzureMarkdownName: (value: string) => void;
  azureAuthHeader: string;
  onChangeAzureAuthHeader: (value: string) => void;
  onSubmitAzureImport: () => void;
  isImportingAzure: boolean;
  isDeleteModalOpen: boolean;
  onCloseDeleteModal: () => void;
  onConfirmDelete: () => void;
  isDeletingItem: boolean;
  selectedNodeForDelete: SelectedNodeForDelete;
};

export default function FileSidebarModals({
  theme,
  isCollectionModalOpen,
  onCloseCollectionModal,
  collectionName,
  onChangeCollectionName,
  onSubmitCollection,
  isSavingCollection,
  isAddItemModalOpen,
  onCloseAddItemModal,
  itemType,
  itemName,
  onChangeItemName,
  fileFormat,
  onSubmitItem,
  isSavingItem,
  selectedNodeForAdd,
  isAzureDevopsModalOpen,
  onCloseAzureDevopsModal,
  azureProjects,
  selectedAzureProject,
  onChangeSelectedAzureProject,
  azureBacklog,
  isLoadingAzureProjects,
  isLoadingAzureBacklog,
  isImportAzureModalOpen,
  onCloseImportAzureModal,
  azureMarkdownUrl,
  onChangeAzureMarkdownUrl,
  azureMarkdownName,
  onChangeAzureMarkdownName,
  azureAuthHeader,
  onChangeAzureAuthHeader,
  onSubmitAzureImport,
  isImportingAzure,
  isDeleteModalOpen,
  onCloseDeleteModal,
  onConfirmDelete,
  isDeletingItem,
  selectedNodeForDelete,
}: FileSidebarModalsProps) {
  const filteredAzureBacklog = useMemo(
    () => filterBacklogToVisibleTypes(azureBacklog),
    [azureBacklog]
  );

  const isDeleteBlocked =
    selectedNodeForDelete?.node.type === "folder" &&
    (selectedNodeForDelete.node.children?.length ?? 0) > 0;

  return (
    <>
      <Modal isOpen={isCollectionModalOpen} onClose={onCloseCollectionModal}>
        <div className="space-y-4">
          <h3
            className={`text-lg font-semibold ${
              theme === "light" ? "text-gray-900" : "text-gray-100"
            }`}
          >
            Add Collection
          </h3>
          <div className="space-y-2">
            <label
              htmlFor="collection-name"
              className={`block text-sm font-medium ${
                theme === "light" ? "text-gray-700" : "text-gray-300"
              }`}
            >
              Collection Name
            </label>
            <input
              id="collection-name"
              type="text"
              value={collectionName}
              onChange={(e) => onChangeCollectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSubmitCollection();
                }
              }}
              placeholder="Enter collection name"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                theme === "light"
                  ? "border-gray-300 bg-white text-gray-900 placeholder-gray-500"
                  : "border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400"
              }`}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onCloseCollectionModal}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                theme === "light"
                  ? "text-gray-700 bg-gray-100 hover:bg-gray-200"
                  : "text-gray-300 bg-gray-700 hover:bg-gray-600"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={onSubmitCollection}
              disabled={!collectionName.trim() || isSavingCollection}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {isSavingCollection ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isAddItemModalOpen} onClose={onCloseAddItemModal}>
        <div className="space-y-4">
          <h3
            className={`text-lg font-semibold ${
              theme === "light" ? "text-gray-900" : "text-gray-100"
            }`}
          >
            Add {itemType === "file" ? "File" : "Folder"}
          </h3>
          {itemType === "file" && (
            <div className="space-y-2">
              <span
                className={`block text-sm font-medium ${
                  theme === "light" ? "text-gray-700" : "text-gray-300"
                }`}
              >
                File Type:{" "}
                <span className={`font-normal ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
                  {fileFormat === "md" ? "Markdown (.md)" : "Data Table (.datatable)"}
                </span>
              </span>
            </div>
          )}
          <div className="space-y-2">
            <label
              htmlFor="item-name"
              className={`block text-sm font-medium ${
                theme === "light" ? "text-gray-700" : "text-gray-300"
              }`}
            >
              {itemType === "file" ? "File" : "Folder"} Name
            </label>
            <input
              id="item-name"
              type="text"
              value={itemName}
              onChange={(e) => onChangeItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSubmitItem();
                }
              }}
              placeholder={`Enter ${itemType} name${
                itemType === "file"
                  ? fileFormat === "datatable"
                    ? " (e.g., my-data)"
                    : " (e.g., example.md)"
                  : ""
              }`}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                theme === "light"
                  ? "border-gray-300 bg-white text-gray-900 placeholder-gray-500"
                  : "border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400"
              }`}
              autoFocus
            />
            {selectedNodeForAdd?.node && (
              <p
                className={`text-xs ${
                  theme === "light" ? "text-gray-500" : "text-gray-400"
                }`}
              >
                Will be added{" "}
                {selectedNodeForAdd.node.type === "folder"
                  ? "inside"
                  : "next to"}{" "}
                &quot;{selectedNodeForAdd.node.name}&quot;
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onCloseAddItemModal}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                theme === "light"
                  ? "text-gray-700 bg-gray-100 hover:bg-gray-200"
                  : "text-gray-300 bg-gray-700 hover:bg-gray-600"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={onSubmitItem}
              disabled={!itemName.trim() || isSavingItem}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {isSavingItem ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isAzureDevopsModalOpen} onClose={onCloseAzureDevopsModal} size="lg">
        <div className="space-y-4">
          <h3
            className={`text-lg font-semibold ${
              theme === "light" ? "text-gray-900" : "text-gray-100"
            }`}
          >
            Azure DevOps Backlog
          </h3>

          <div className="space-y-2">
            <label
              htmlFor="azure-project"
              className={`block text-sm font-medium ${
                theme === "light" ? "text-gray-700" : "text-gray-300"
              }`}
            >
              Project
            </label>

            {isLoadingAzureProjects ? (
              <p className={theme === "light" ? "text-sm text-gray-600" : "text-sm text-gray-400"}>
                Loading projects…
              </p>
            ) : (
              <select
                id="azure-project"
                value={selectedAzureProject}
                onChange={(e) => onChangeSelectedAzureProject(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === "light"
                    ? "border-gray-300 bg-white text-gray-900"
                    : "border-gray-600 bg-gray-700 text-gray-100"
                }`}
              >
                <option value="" disabled>
                  Select a project…
                </option>
                {azureProjects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className={theme === "light" ? "text-sm font-semibold text-gray-800" : "text-sm font-semibold text-gray-200"}>
                Backlog
              </h4>
              {isLoadingAzureBacklog && (
                <span className={theme === "light" ? "text-xs text-gray-500" : "text-xs text-gray-400"}>
                  Loading…
                </span>
              )}
            </div>

            {selectedAzureProject && !isLoadingAzureBacklog && filteredAzureBacklog.length === 0 ? (
              <p className={theme === "light" ? "text-sm text-gray-600" : "text-sm text-gray-400"}>
                {azureBacklog.length > 0
                  ? "No Epic, Feature, or User Story items in this backlog."
                  : "No backlog items found in this project."}
              </p>
            ) : (
              <div className="rounded-md border border-gray-200 dark:border-gray-700">
                <div className="max-h-[420px] overflow-auto">
                  <BacklogTree
                    theme={theme}
                    nodes={filteredAzureBacklog}
                    isLoading={isLoadingAzureBacklog}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onCloseAzureDevopsModal}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                theme === "light"
                  ? "text-gray-700 bg-gray-100 hover:bg-gray-200"
                  : "text-gray-300 bg-gray-700 hover:bg-gray-600"
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isImportAzureModalOpen} onClose={onCloseImportAzureModal} size="md">
        <div className="space-y-4">
          <h3
            className={`text-lg font-semibold ${
              theme === "light" ? "text-gray-900" : "text-gray-100"
            }`}
          >
            Import Markdown from Azure
          </h3>

          <div className="space-y-2">
            <label
              htmlFor="azure-md-url"
              className={`block text-sm font-medium ${
                theme === "light" ? "text-gray-700" : "text-gray-300"
              }`}
            >
              Markdown URL
            </label>
            <input
              id="azure-md-url"
              type="url"
              value={azureMarkdownUrl}
              onChange={(e) => onChangeAzureMarkdownUrl(e.target.value)}
              placeholder="https://.../file.md (SAS URLs work)"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                theme === "light"
                  ? "border-gray-300 bg-white text-gray-900 placeholder-gray-500"
                  : "border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400"
              }`}
              autoFocus
            />
            <p className={theme === "light" ? "text-xs text-gray-500" : "text-xs text-gray-400"}>
              Tip: Use an Azure Blob SAS URL or any raw markdown URL accessible by the server.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="azure-md-name"
              className={`block text-sm font-medium ${
                theme === "light" ? "text-gray-700" : "text-gray-300"
              }`}
            >
              File name (optional)
            </label>
            <input
              id="azure-md-name"
              type="text"
              value={azureMarkdownName}
              onChange={(e) => onChangeAzureMarkdownName(e.target.value)}
              placeholder="example.md"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                theme === "light"
                  ? "border-gray-300 bg-white text-gray-900 placeholder-gray-500"
                  : "border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400"
              }`}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="azure-auth-header"
              className={`block text-sm font-medium ${
                theme === "light" ? "text-gray-700" : "text-gray-300"
              }`}
            >
              Authorization header (optional)
            </label>
            <input
              id="azure-auth-header"
              type="text"
              value={azureAuthHeader}
              onChange={(e) => onChangeAzureAuthHeader(e.target.value)}
              placeholder='e.g. Bearer <token>  (or leave empty if using SAS URL)'
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                theme === "light"
                  ? "border-gray-300 bg-white text-gray-900 placeholder-gray-500"
                  : "border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400"
              }`}
            />
          </div>

          {selectedNodeForAdd?.node && (
            <p className={theme === "light" ? "text-xs text-gray-500" : "text-xs text-gray-400"}>
              Will be imported{" "}
              {selectedNodeForAdd.node.type === "folder" ? "inside" : "next to"}{" "}
              &quot;{selectedNodeForAdd.node.name}&quot;
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onCloseImportAzureModal}
              disabled={isImportingAzure}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                theme === "light"
                  ? "text-gray-700 bg-gray-100 hover:bg-gray-200"
                  : "text-gray-300 bg-gray-700 hover:bg-gray-600"
              } disabled:opacity-70`}
            >
              Cancel
            </button>
            <button
              onClick={onSubmitAzureImport}
              disabled={!azureMarkdownUrl.trim() || isImportingAzure}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {isImportingAzure ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={onCloseDeleteModal}>
        <div className="space-y-4">
          <h3
            className={`text-lg font-semibold ${
              theme === "light" ? "text-gray-900" : "text-gray-100"
            }`}
          >
            Delete {selectedNodeForDelete?.node.type === "folder" ? "Folder" : "File"}
          </h3>
          {isDeleteBlocked ? (
            <p className={theme === "light" ? "text-sm text-gray-600" : "text-sm text-gray-300"}>
              This folder is not empty. Remove its contents before deleting.
            </p>
          ) : (
            <p className={theme === "light" ? "text-sm text-gray-600" : "text-sm text-gray-300"}>
              This will permanently delete{" "}
              <span className="font-semibold">
                &quot;{selectedNodeForDelete?.node.name ?? "this item"}&quot;
              </span>
              {selectedNodeForDelete?.node.type === "folder"
                ? " and all of its contents."
                : "."}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onCloseDeleteModal}
              disabled={isDeletingItem}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                theme === "light"
                  ? "text-gray-700 bg-gray-100 hover:bg-gray-200"
                  : "text-gray-300 bg-gray-700 hover:bg-gray-600"
              } disabled:opacity-70`}
            >
              Cancel
            </button>
            <button
              onClick={onConfirmDelete}
              disabled={isDeletingItem || isDeleteBlocked}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {isDeletingItem ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

