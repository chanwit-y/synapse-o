"use client";

import Modal from "./Modal";
import { TreeNode } from "./TreeView";

type SelectedNodeForAdd =
  | { node: TreeNode | null; path: string | null; groupIndex: number }
  | null;

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
  onSubmitItem: () => void;
  isSavingItem: boolean;
  selectedNodeForAdd: SelectedNodeForAdd;
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
  onSubmitItem,
  isSavingItem,
  selectedNodeForAdd,
}: FileSidebarModalsProps) {
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
                itemType === "file" ? " (e.g., example.md)" : ""
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
                "{selectedNodeForAdd.node.name}"
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
    </>
  );
}

