"use client";
/**
 * @file FileSidebarModals.tsx
 * @description Modal dialogs for managing file/folder collections including add collection, add item, and delete confirmation modals.
 */

import Modal from "./Modal";
import type { TreeNode } from "./@types/treeViewTypes";
import AzureBacklogModal from "./AzureBacklogModal";
import type { BacklogNode } from "./AzureBacklogModal";
import CustomSelect from "./CustomSelect";

type SelectedNodeForAdd =
  | { node: TreeNode | null; path: string | null; groupIndex: number }
  | null;

type SelectedNodeForDelete =
  | { node: TreeNode; path: string; groupIndex: number }
  | null;

type FileFormat = "md" | "datatable" | "code";

const CODE_EXTENSIONS = [
  { value: "ts", label: "TypeScript (.ts)" },
  { value: "tsx", label: "TypeScript React (.tsx)" },
  { value: "js", label: "JavaScript (.js)" },
  { value: "jsx", label: "JavaScript React (.jsx)" },
  { value: "rs", label: "Rust (.rs)" },
  { value: "go", label: "Go (.go)" },
  { value: "py", label: "Python (.py)" },
  { value: "java", label: "Java (.java)" },
  { value: "css", label: "CSS (.css)" },
  { value: "html", label: "HTML (.html)" },
  { value: "json", label: "JSON (.json)" },
  { value: "yaml", label: "YAML (.yaml)" },
  { value: "sql", label: "SQL (.sql)" },
  { value: "sh", label: "Shell (.sh)" },
] as const;

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
  codeExtension: string;
  onChangeCodeExtension: (value: string) => void;
  onSubmitItem: () => void;
  isSavingItem: boolean;
  selectedNodeForAdd: SelectedNodeForAdd;
  isAzureDevopsModalOpen: boolean;
  onCloseAzureDevopsModal: () => void;
  azureProjects: { id: string; name: string }[];
  selectedAzureProject: string;
  onChangeSelectedAzureProject: (project: string) => void;
  selectedAzureTeam: string;
  onChangeSelectedAzureTeam: (team: string) => void;
  azureTeams: { id: string; name: string }[];
  isLoadingAzureTeams: boolean;
  azureBacklog: BacklogNode[];
  isLoadingAzureProjects: boolean;
  isLoadingAzureBacklog: boolean;
  azureCheckedUserStoryIds: number[];
  onToggleAzureUserStoryCheck: (id: number) => void;
  onImportUserStoriesToMd: () => void;
  isImportingUserStoriesMd: boolean;
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
  codeExtension,
  onChangeCodeExtension,
  onSubmitItem,
  isSavingItem,
  selectedNodeForAdd,
  isAzureDevopsModalOpen,
  onCloseAzureDevopsModal,
  azureProjects,
  selectedAzureProject,
  onChangeSelectedAzureProject,
  selectedAzureTeam,
  onChangeSelectedAzureTeam,
  azureTeams,
  isLoadingAzureTeams,
  azureBacklog,
  isLoadingAzureProjects,
  isLoadingAzureBacklog,
  azureCheckedUserStoryIds,
  onToggleAzureUserStoryCheck,
  onImportUserStoriesToMd,
  isImportingUserStoriesMd,
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
  const isDeleteBlocked =
    selectedNodeForDelete?.node.type === "folder" &&
    (selectedNodeForDelete.node.children?.length ?? 0) > 0;

  return (
    <>
      <Modal isOpen={isCollectionModalOpen} onClose={onCloseCollectionModal}>
        <div className="space-y-4">
          <h3
            className={`text-lg font-semibold ${theme === "light" ? "text-gray-900" : "text-gray-100"
              }`}
          >
            Add Collection
          </h3>
          <div className="space-y-2">
            <label
              htmlFor="collection-name"
              className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"
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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === "light"
                  ? "border-gray-300 bg-white text-gray-900 placeholder-gray-500"
                  : "border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400"
                }`}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onCloseCollectionModal}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${theme === "light"
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
            className={`text-lg font-semibold ${theme === "light" ? "text-gray-900" : "text-gray-100"
              }`}
          >
            Add {itemType === "file" ? "File" : "Folder"}
          </h3>
          {itemType === "file" && fileFormat !== "code" && (
            <div className="space-y-2">
              <span
                className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"
                  }`}
              >
                File Type:{" "}
                <span className={`font-normal ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
                  {fileFormat === "md" ? "Markdown (.md)" : "Data Table (.datatable)"}
                </span>
              </span>
            </div>
          )}
          {itemType === "file" && fileFormat === "code" && (
            <div className="space-y-2">
              <label
                className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}
              >
                Language
              </label>
              <CustomSelect
                value={codeExtension}
                onChange={onChangeCodeExtension}
                options={CODE_EXTENSIONS.map((ext) => ({ value: ext.value, label: ext.label }))}
                placeholder="Select language…"
                theme={theme}
                ariaLabel="Code file language"
              />
            </div>
          )}
          <div className="space-y-2">
            <label
              htmlFor="item-name"
              className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"
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
              placeholder={`Enter ${itemType} name${itemType === "file"
                  ? fileFormat === "datatable"
                    ? " (e.g., my-data)"
                    : fileFormat === "code"
                      ? ` (e.g., utils.${codeExtension})`
                      : " (e.g., example.md)"
                  : ""
                }`}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === "light"
                  ? "border-gray-300 bg-white text-gray-900 placeholder-gray-500"
                  : "border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400"
                }`}
              autoFocus
            />
            {selectedNodeForAdd?.node && (
              <p
                className={`text-xs ${theme === "light" ? "text-gray-500" : "text-gray-400"
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
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${theme === "light"
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

      <AzureBacklogModal
        theme={theme}
        isOpen={isAzureDevopsModalOpen}
        onClose={onCloseAzureDevopsModal}
        azureProjects={azureProjects}
        selectedAzureProject={selectedAzureProject}
        onChangeSelectedAzureProject={onChangeSelectedAzureProject}
        selectedAzureTeam={selectedAzureTeam}
        onChangeSelectedAzureTeam={onChangeSelectedAzureTeam}
        azureTeams={azureTeams}
        isLoadingAzureTeams={isLoadingAzureTeams}
        azureBacklog={azureBacklog}
        isLoadingAzureProjects={isLoadingAzureProjects}
        isLoadingAzureBacklog={isLoadingAzureBacklog}
        azureCheckedUserStoryIds={azureCheckedUserStoryIds}
        onToggleAzureUserStoryCheck={onToggleAzureUserStoryCheck}
        onImportUserStoriesToMd={onImportUserStoriesToMd}
        isImportingUserStoriesMd={isImportingUserStoriesMd}
      />

      <Modal isOpen={isImportAzureModalOpen} onClose={onCloseImportAzureModal} size="md">
        <div className="space-y-4">
          <h3
            className={`text-lg font-semibold ${theme === "light" ? "text-gray-900" : "text-gray-100"
              }`}
          >
            Import Markdown from Azure
          </h3>

          <div className="space-y-2">
            <label
              htmlFor="azure-md-url"
              className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"
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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === "light"
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
              className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"
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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === "light"
                  ? "border-gray-300 bg-white text-gray-900 placeholder-gray-500"
                  : "border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400"
                }`}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="azure-auth-header"
              className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"
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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === "light"
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
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${theme === "light"
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
            className={`text-lg font-semibold ${theme === "light" ? "text-gray-900" : "text-gray-100"
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
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${theme === "light"
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

