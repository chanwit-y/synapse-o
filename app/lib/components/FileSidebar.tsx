"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen, PlusIcon } from "lucide-react";
import TreeView, { TreeNode, TreeViewGroup } from "./TreeView";
import Modal from "./Modal";
import { useTheme } from "./ThemeProvider";
import { createCollection, findAllCollections, updateCollectionDirectories } from "@/app/ui/doc/action";

const mockUuid = (() => {
  let i = 0;
  return () => `mock-uuid-${++i}`;
})();

function parseDirectories(raw: unknown): TreeNode[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as TreeNode[];

  if (typeof raw === "string") {
    // Tolerate historical double-encoding (JSON string inside JSON string).
    try {
      const once = JSON.parse(raw) as unknown;
      if (Array.isArray(once)) return once as TreeNode[];
      if (typeof once === "string") {
        try {
          const twice = JSON.parse(once) as unknown;
          return Array.isArray(twice) ? (twice as TreeNode[]) : [];
        } catch {
          return [];
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  return [];
}

function assignCollectionId(nodes: TreeNode[], collectionId: string): TreeNode[] {
  return nodes.map((node) => {
    const next: TreeNode = {
      ...node,
      collectionId: node.collectionId || collectionId,
    };
    if (next.type === "folder" && next.children?.length) {
      next.children = assignCollectionId(next.children, collectionId);
    }
    return next;
  });
}

// // Sample folder structure data - only .md files
// const sampleTreeData: TreeViewGroup[] = [
//   {
//     id: mockUuid(),
//     name: "group1",
//     directories: [
//       {
//         id: mockUuid(),
//         name: "docs",
//         type: "folder",
//         children: [
//           {
//             id: mockUuid(),
//             name: "getting-started",
//             type: "folder",
//             children: [
//               { id: mockUuid(), name: "introduction.md", type: "file" },
//               { id: mockUuid(), name: "installation.md", type: "file" },
//               { id: mockUuid(), name: "quick-start.md", type: "file" },
//             ],
//           },
//           {
//             id: mockUuid(),
//             name: "guides",
//             type: "folder",
//             children: [
//               { id: mockUuid(), name: "api-reference.md", type: "file" },
//               { id: mockUuid(), name: "best-practices.md", type: "file" },
//               { id: mockUuid(), name: "troubleshooting.md", type: "file" },
//             ],
//           },
//           {
//             id: mockUuid(),
//             name: "examples",
//             type: "folder",
//             children: [
//               { id: mockUuid(), name: "basic-usage.md", type: "file" },
//               { id: mockUuid(), name: "advanced-features.md", type: "file" },
//             ],
//           },
//           { id: mockUuid(), name: "changelog.md", type: "file" },
//           { id: mockUuid(), name: "contributing.md", type: "file" },
//         ],
//       },
//       {
//         id: mockUuid(),
//         name: "notes",
//         type: "folder",
//         children: [
//           { id: mockUuid(), name: "meeting-notes.md", type: "file" },
//           { id: mockUuid(), name: "ideas.md", type: "file" },
//           { id: mockUuid(), name: "todo.md", type: "file" },
//           {
//             id: mockUuid(),
//             name: "projects",
//             type: "folder",
//             children: [
//               { id: mockUuid(), name: "project-alpha.md", type: "file" },
//               { id: mockUuid(), name: "project-beta.md", type: "file" },
//             ],
//           },
//         ],
//       },
//       {
//         id: mockUuid(),
//         name: "README.md",
//         type: "file",
//       },
//     ],
//   },
//   {
//     id: mockUuid(),
//     name: "group2",
//     directories: [
//       {
//         id: mockUuid(),
//         name: "src",
//         type: "folder",
//         children: [
//           {
//             id: mockUuid(),
//             name: "components",
//             type: "folder",
//             children: [
//               { id: mockUuid(), name: "Button.tsx", type: "file" },
//               { id: mockUuid(), name: "Card.tsx", type: "file" },
//               { id: mockUuid(), name: "Modal.tsx", type: "file" },
//             ],
//           },
//           {
//             id: mockUuid(),
//             name: "utils",
//             type: "folder",
//             children: [
//               { id: mockUuid(), name: "helpers.ts", type: "file" },
//               { id: mockUuid(), name: "constants.ts", type: "file" },
//             ],
//           },
//           { id: mockUuid(), name: "index.ts", type: "file" },
//         ],
//       },
//       {
//         id: mockUuid(),
//         name: "tests",
//         type: "folder",
//         children: [
//           {
//             id: mockUuid(),
//             name: "unit",
//             type: "folder",
//             children: [{ id: mockUuid(), name: "test-utils.ts", type: "file" }],
//           },
//           {
//             id: mockUuid(),
//             name: "integration",
//             type: "folder",
//             children: [{ id: mockUuid(), name: "api.test.ts", type: "file" }],
//           },
//         ],
//       },
//     ],
//   },
// ];

export default function FileSidebar({
  collapsed = false,
  onToggleCollapsed,
  onSelectFile,
}: {
  collapsed?: boolean;
  onToggleCollapsed: () => void;
  onSelectFile?: (file: TreeNode) => void;
}) {
  const { theme } = useTheme();
  const [collections, setCollections] = useState<TreeViewGroup[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [isSavingCollection, setIsSavingCollection] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemType, setItemType] = useState<"file" | "folder">("file");
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [selectedNodeForAdd, setSelectedNodeForAdd] = useState<{ node: TreeNode | null; path: string | null; groupIndex: number } | null>(null);


  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const collections = await findAllCollections();
        if (!isMounted) return;

        setCollections(
          collections.map((collection) => {
            const directories = assignCollectionId(
              parseDirectories(collection.directories),
              collection.id
            );

            return {
              id: collection.id,
              name: collection.name ?? "",
              directories,
            };
          })
        );
      } finally {
        if (isMounted) setIsLoadingCollections(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const SkeletonTree = ({ rows = 10 }: { rows?: number }) => (
    <div className="px-3 py-3 space-y-3">
      <div className="space-y-2">
        <div
          className={[
            "h-4 w-32 rounded animate-pulse",
            theme === "light" ? "bg-gray-200" : "bg-gray-800",
          ].join(" ")}
        />
        <div
          className={[
            "h-3 w-24 rounded animate-pulse",
            theme === "light" ? "bg-gray-200" : "bg-gray-800",
          ].join(" ")}
        />
      </div>

      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className={[
                "h-3 w-3 rounded-sm animate-pulse",
                theme === "light" ? "bg-gray-200" : "bg-gray-800",
              ].join(" ")}
            />
            <div
              className={[
                "h-3 rounded animate-pulse",
                theme === "light" ? "bg-gray-200" : "bg-gray-800",
              ].join(" ")}
              style={{ width: `${Math.max(90, 160 - idx * 6)}px` }}
            />
          </div>
        ))}
      </div>
    </div>
  );

  const handleNodeClick = (node: TreeNode) => {
    if (node.type === "file") {
      onSelectFile?.(node);
    }
  };

  const handleAddCollection = async () => {
    const name = collectionName.trim();
    if (!name || isSavingCollection) return;

    setIsSavingCollection(true);
    try {
      const created = await createCollection(name);
      const newCollection: TreeViewGroup = {
        id: created.id,
        name: created.name ?? name,
        directories: parseDirectories(created.directories),
      };
      setCollections((prev) => [...prev, newCollection]);
      setCollectionName("");
      setIsModalOpen(false);
    } finally {
      setIsSavingCollection(false);
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

  const handleAddItem = async () => {
    const name = itemName.trim();
    if (!name || isSavingItem) return;
    if (!selectedNodeForAdd) return;

    const newItem: TreeNode = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : mockUuid(),
      name,
      type: itemType,
      ...(itemType === "folder" ? { children: [] } : {}),
      collectionId: "",
      extension: null,
      content: null,
      createdAt: 0,
      updatedAt: 0
    };

    const targetGroupIndex = selectedNodeForAdd.groupIndex ?? 0;
    const existingGroup = collections[targetGroupIndex];
    if (!existingGroup) return;

    const updatedCollections: TreeViewGroup[] = JSON.parse(JSON.stringify(collections)); // Deep clone
    const group = updatedCollections[targetGroupIndex];
    newItem.collectionId = group.id;

    const findNodeByPath = (nodes: TreeNode[], path: string[]): TreeNode | null => {
      if (path.length === 0) return null;
      const [head, ...rest] = path;
      const current = nodes.find((n) => n.name === head) ?? null;
      if (!current) return null;
      if (rest.length === 0) return current;
      if (current.type !== "folder") return null;
      return findNodeByPath(current.children ?? [], rest);
    };

    if (!selectedNodeForAdd.node || !selectedNodeForAdd.path) {
      group.directories.push(newItem);
    } else {
      const selectedNode = selectedNodeForAdd.node;
      const pathSegments = selectedNodeForAdd.path.split("/");

      if (selectedNode.type === "folder") {
        const folder = findNodeByPath(group.directories, pathSegments);
        if (folder && folder.type === "folder") {
          folder.children = folder.children ?? [];
          folder.children.push(newItem);
        } else {
          group.directories.push(newItem);
        }
      } else {
        if (pathSegments.length > 1) {
          const parentPath = pathSegments.slice(0, -1);
          const parent = findNodeByPath(group.directories, parentPath);
          if (parent && parent.type === "folder") {
            parent.children = parent.children ?? [];
            parent.children.push(newItem);
          } else {
            group.directories.push(newItem);
          }
        } else {
          group.directories.push(newItem);
        }
      }
    }

    setCollections(updatedCollections);
    handleCloseAddItemModal();

    setIsSavingItem(true);
    try {
      await updateCollectionDirectories(group.id, group.directories);
    } catch (err) {
      console.error("Failed to update collection directories:", err);
      // Best-effort rollback (to pre-click UI state)
      setCollections(collections);
    } finally {
      setIsSavingItem(false);
    }
  };

  const footerButtonLabel = collapsed ? "Show sidebar" : "Hide sidebar";

  return (
    <>
      <aside
        className={[
          "flex flex-col h-[calc(100vh-4rem)] transition-[width] duration-200 overflow-hidden",
          collapsed ? "w-12" : "w-64",
          "border-r",
          theme === "light" ? "bg-white border-gray-200" : "bg-gray-900 border-gray-800",
        ].join(" ")}
      >
        <div
          className={`flex items-center justify-between border-b ${
            collapsed ? "px-2 py-3" : "px-4 py-3"
          } ${
            theme === "light"
              ? "border-gray-200 bg-gray-50/50"
              : "border-gray-800 bg-gray-900"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={footerButtonLabel}
              className={[
                "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                theme === "light"
                  ? "text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                  : "text-gray-300 hover:bg-gray-800 hover:text-gray-100",
              ].join(" ")}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>

            <h2
              className={[
                "text-sm font-semibold uppercase tracking-wide truncate",
                collapsed ? "sr-only" : "",
                theme === "light" ? "text-gray-800" : "text-gray-300",
              ].join(" ")}
            >
              Collection
            </h2>
          </div>

          <button
            onClick={handleOpenModal}
            className={[
              "p-1.5 rounded-md transition-colors",
              collapsed ? "sr-only" : "",
              theme === "light"
                ? "text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200",
            ].join(" ")}
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>

        <div
          className={[
            "flex flex-col flex-1 min-h-0",
            collapsed ? "opacity-0 pointer-events-none" : "opacity-100",
          ].join(" ")}
        >
          <div className="flex-1 overflow-hidden">
            {isLoadingCollections ? (
              <SkeletonTree />
            ) : (
              <TreeView
                data={collections}
                onNodeClick={handleNodeClick}
                onAddFile={handleAddFile}
                onAddFolder={handleAddFolder}
              />
            )}
          </div>
        </div>
      </aside>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${
            theme === "light" ? "text-gray-900" : "text-gray-100"
          }`}>
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
              onChange={(e) => setCollectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddCollection();
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
              onClick={handleCloseModal}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                theme === "light"
                  ? "text-gray-700 bg-gray-100 hover:bg-gray-200"
                  : "text-gray-300 bg-gray-700 hover:bg-gray-600"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleAddCollection}
              disabled={!collectionName.trim() || isSavingCollection}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {isSavingCollection ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isAddItemModalOpen} onClose={handleCloseAddItemModal}>
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${
            theme === "light" ? "text-gray-900" : "text-gray-100"
          }`}>
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
              onChange={(e) => setItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddItem();
                }
              }}
              placeholder={`Enter ${itemType} name${itemType === "file" ? " (e.g., example.md)" : ""}`}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                theme === "light"
                  ? "border-gray-300 bg-white text-gray-900 placeholder-gray-500"
                  : "border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400"
              }`}
              autoFocus
            />
            {selectedNodeForAdd?.node && (
              <p className={`text-xs ${
                theme === "light" ? "text-gray-500" : "text-gray-400"
              }`}>
                Will be added {selectedNodeForAdd.node.type === "folder" ? "inside" : "next to"} "{selectedNodeForAdd.node.name}"
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleCloseAddItemModal}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                theme === "light"
                  ? "text-gray-700 bg-gray-100 hover:bg-gray-200"
                  : "text-gray-300 bg-gray-700 hover:bg-gray-600"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleAddItem}
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

