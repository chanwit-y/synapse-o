"use client";

import TreeView, { TreeNode } from "./TreeView";

// Sample folder structure data - only .md files
const sampleTreeData: TreeNode[] = [
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
];

export default function Sidebar() {
  const handleNodeClick = (node: TreeNode) => {
    console.log("Node clicked:", node);
    // You can add custom logic here, like opening files, etc.
  };

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col h-[calc(100vh-4rem)]">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Explorer
        </h2>
      </div>
      <div className="flex-1 overflow-hidden">
        <TreeView data={sampleTreeData} onNodeClick={handleNodeClick} />
      </div>
    </aside>
  );
}

