"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import TreeView, { TreeNode, TreeViewGroup } from "./TreeView";
import Modal from "./Modal";

// Sample folder structure data - only .md files
const sampleTreeData: TreeViewGroup[] = [
  {
    groupName: "group1",
    directories: [
      {
        name: "docs",
        type: "folder",
        children: [
          {
            name: "getting-started",
            type: "folder",
            children: [
              { name: "introduction.md", type: "file" },
              { name: "installation.md", type: "file" },
              { name: "quick-start.md", type: "file" },
            ],
          },
          {
            name: "guides",
            type: "folder",
            children: [
              { name: "api-reference.md", type: "file" },
              { name: "best-practices.md", type: "file" },
              { name: "troubleshooting.md", type: "file" },
            ],
          },
          {
            name: "examples",
            type: "folder",
            children: [
              { name: "basic-usage.md", type: "file" },
              { name: "advanced-features.md", type: "file" },
            ],
          },
          { name: "changelog.md", type: "file" },
          { name: "contributing.md", type: "file" },
        ],
      },
      {
        name: "notes",
        type: "folder",
        children: [
          { name: "meeting-notes.md", type: "file" },
          { name: "ideas.md", type: "file" },
          { name: "todo.md", type: "file" },
          {
            name: "projects",
            type: "folder",
            children: [
              { name: "project-alpha.md", type: "file" },
              { name: "project-beta.md", type: "file" },
            ],
          },
        ],
      },
      {
        name: "README.md",
        type: "file",
      },
    ],
  },
  {
    groupName: "group2",
    directories: [
      {
        name: "src",
        type: "folder",
        children: [
          {
            name: "components",
            type: "folder",
            children: [
              { name: "Button.tsx", type: "file" },
              { name: "Card.tsx", type: "file" },
              { name: "Modal.tsx", type: "file" },
            ],
          },
          {
            name: "utils",
            type: "folder",
            children: [
              { name: "helpers.ts", type: "file" },
              { name: "constants.ts", type: "file" },
            ],
          },
          { name: "index.ts", type: "file" },
        ],
      },
      {
        name: "tests",
        type: "folder",
        children: [
          { name: "unit", type: "folder", children: [{ name: "test-utils.ts", type: "file" }] },
          { name: "integration", type: "folder", children: [{ name: "api.test.ts", type: "file" }] },
        ],
      },
    ],
  },
];

export default function Sidebar() {
  const [collections, setCollections] = useState<TreeViewGroup[]>(sampleTreeData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemType, setItemType] = useState<"file" | "folder">("file");
  const [selectedNodeForAdd, setSelectedNodeForAdd] = useState<{ node: TreeNode | null; path: string | null; groupIndex: number } | null>(null);

  const handleNodeClick = (node: TreeNode) => {
    console.log("Node clicked:", node);
    // You can add custom logic here, like opening files, etc.
  };

  const handleAddCollection = () => {
    if (collectionName.trim()) {
      const newCollection: TreeViewGroup = {
        groupName: collectionName.trim(),
        directories: [],
      };
      setCollections([...collections, newCollection]);
      setCollectionName("");
      setIsModalOpen(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCollectionName("");
  };

  const handleAddFile = (selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number) => {
    setSelectedNodeForAdd({ node: selectedNode, path: selectedNodePath, groupIndex });
    setItemType("file");
    setItemName("");
    setIsAddItemModalOpen(true);
  };

  const handleAddFolder = (selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number) => {
    setSelectedNodeForAdd({ node: selectedNode, path: selectedNodePath, groupIndex });
    setItemType("folder");
    setItemName("");
    setIsAddItemModalOpen(true);
  };

  const handleCloseAddItemModal = () => {
    setIsAddItemModalOpen(false);
    setItemName("");
    setSelectedNodeForAdd(null);
  };

  const handleAddItem = () => {
    if (!itemName.trim()) return;

    const newItem: TreeNode = {
      name: itemName.trim(),
      type: itemType,
      ...(itemType === "folder" ? { children: [] } : {}),
    };

    setCollections((prevCollections) => {
      const updatedCollections = JSON.parse(JSON.stringify(prevCollections)); // Deep clone

      if (!selectedNodeForAdd?.node || !selectedNodeForAdd?.path) {
        // If no node is selected, add to the specific collection (group) where the button was clicked
        const targetGroupIndex = selectedNodeForAdd?.groupIndex ?? 0;
        if (targetGroupIndex >= 0 && targetGroupIndex < updatedCollections.length) {
          updatedCollections[targetGroupIndex].directories.push(newItem);
        }
        return updatedCollections;
      }

      const selectedNode = selectedNodeForAdd.node;
      const selectedPath = selectedNodeForAdd.path;
      const pathSegments = selectedPath.split("/");

      // Helper function to find node by path
      const findNodeByPath = (groups: TreeViewGroup[], path: string[]): TreeNode | null => {
        if (path.length === 0) return null;

        for (const group of groups) {
          for (const dir of group.directories) {
            if (dir.name === path[0]) {
              if (path.length === 1) {
                return dir;
              }
              if (dir.children && path.length > 1) {
                return findNodeByPath(
                  [{ groupName: "", directories: dir.children }],
                  path.slice(1)
                );
              }
            }
          }
        }
        return null;
      };

      // If selected node is a folder, add to its children
      if (selectedNode.type === "folder") {
        const targetFolder = findNodeByPath(updatedCollections, pathSegments);
        if (targetFolder) {
          if (!targetFolder.children) {
            targetFolder.children = [];
          }
          targetFolder.children.push(newItem);
        } else {
          // Fallback: add to the collection where the button was clicked
          const targetGroupIndex = selectedNodeForAdd?.groupIndex ?? 0;
          if (targetGroupIndex >= 0 && targetGroupIndex < updatedCollections.length) {
            updatedCollections[targetGroupIndex].directories.push(newItem);
          }
        }
      } else {
        // If selected node is a file, add to its parent folder
        if (pathSegments.length > 1) {
          // Get parent path (remove last segment)
          const parentPath = pathSegments.slice(0, -1);
          const parentFolder = findNodeByPath(updatedCollections, parentPath);
          
          if (parentFolder && parentFolder.type === "folder") {
            if (!parentFolder.children) {
              parentFolder.children = [];
            }
            parentFolder.children.push(newItem);
          } else {
            // Fallback: add to the collection where the button was clicked
            const targetGroupIndex = selectedNodeForAdd?.groupIndex ?? 0;
            if (targetGroupIndex >= 0 && targetGroupIndex < updatedCollections.length) {
              updatedCollections[targetGroupIndex].directories.push(newItem);
            }
          }
        } else {
          // File is at root level, add to same group's root
          // Find which group contains this file
          for (const group of updatedCollections) {
            const fileIndex = group.directories.findIndex(
              (dir: TreeNode) => dir.name === pathSegments[0] && dir.type === "file"
            );
            if (fileIndex !== -1) {
              group.directories.push(newItem);
              return updatedCollections;
            }
          }
          // Fallback: add to the collection where the button was clicked
          const targetGroupIndex = selectedNodeForAdd?.groupIndex ?? 0;
          if (targetGroupIndex >= 0 && targetGroupIndex < updatedCollections.length) {
            updatedCollections[targetGroupIndex].directories.push(newItem);
          }
        }
      }

      return updatedCollections;
    });

    handleCloseAddItemModal();
  };

  return (
    <>
      <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Collection 
          </h2>
          <button 
            onClick={handleOpenModal}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <TreeView 
            data={collections} 
            onNodeClick={handleNodeClick}
            onAddFile={handleAddFile}
            onAddFolder={handleAddFolder}
          />
        </div>
      </aside>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Add Collection
          </h3>
          <div className="space-y-2">
            <label 
              htmlFor="collection-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Collection Name
            </label>
            <input
              id="collection-name"
              type="text"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddCollection();
                }
              }}
              placeholder="Enter collection name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddCollection}
              disabled={!collectionName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isAddItemModalOpen} onClose={handleCloseAddItemModal}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Add {itemType === "file" ? "File" : "Folder"}
          </h3>
          <div className="space-y-2">
            <label 
              htmlFor="item-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {itemType === "file" ? "File" : "Folder"} Name
            </label>
            <input
              id="item-name"
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddItem();
                }
              }}
              placeholder={`Enter ${itemType} name${itemType === "file" ? " (e.g., example.md)" : ""}`}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            {selectedNodeForAdd?.node && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Will be added {selectedNodeForAdd.node.type === "folder" ? "inside" : "next to"} "{selectedNodeForAdd.node.name}"
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleCloseAddItemModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddItem}
              disabled={!itemName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

