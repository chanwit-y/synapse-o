"use client";
/**
 * @file FileSidebar.tsx
 * @description Main file/collection sidebar managing collections, file/folder CRUD operations, and selection state with skeleton loading.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanelLeftClose, PanelLeftOpen, PlusIcon } from "lucide-react";
import TreeView from "./TreeView";
import type { TreeNode, TreeViewGroup } from "./@types/treeViewTypes";
import type { FileType } from "./TreeViewGroupItem";
import FileSidebarModals from "./FileSidebarModals";
import { useSnackbar } from "./Snackbar";
import { useTheme } from "./ThemeProvider";
import { createCollection, findAllCollections, findFileIconsByIds, updateCollectionDirectories, getAllSubFileContentIds } from "@/app/ui/doc/action";
import { hasAzurePatConfigured } from "@/app/ui/settings/azure-api-key/action";
import { fileService } from "@/app/lib/services/fileService.client";

type BacklogNode = { id: number; title: string; state: string; workItemType: string; children: BacklogNode[] };

const mockUuid = (() => {
  let i = 0;
  return () => `mock-uuid-${++i}`;
})();

function sanitizeUserStoryMdFilename(title: string, id: number): string {
  const base = (title || "user-story")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");
  return `${base || "user-story"}-${id}.md`;
}

/** Parent list where a new folder should be added as a sibling of the selected tree node. */
function getSiblingContainerList(
  directories: TreeNode[],
  pathSegments: string[],
  selectedType: "folder" | "file" | null,
): TreeNode[] {
  const findNodeByPath = (nodes: TreeNode[], path: string[]): TreeNode | null => {
    if (path.length === 0) return null;
    const [head, ...rest] = path;
    const current = nodes.find((n) => n.name === head) ?? null;
    if (!current) return null;
    if (rest.length === 0) return current;
    if (current.type !== "folder") return null;
    return findNodeByPath(current.children ?? [], rest);
  };

  if (pathSegments.length === 0 || selectedType == null) {
    return directories;
  }

  if (selectedType === "folder") {
    if (pathSegments.length === 1) return directories;
    const parentPath = pathSegments.slice(0, -1);
    const parent = findNodeByPath(directories, parentPath);
    if (!parent || parent.type !== "folder") return directories;
    parent.children = parent.children ?? [];
    return parent.children;
  }

  if (pathSegments.length === 1) return directories;
  const parentPath = pathSegments.slice(0, -1);
  const parent = findNodeByPath(directories, parentPath);
  if (!parent || parent.type !== "folder") return directories;
  parent.children = parent.children ?? [];
  return parent.children;
}

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

function collectFileIds(nodes: TreeNode[], acc: Set<string>) {
  nodes.forEach((node) => {
    if (node.type === "file") acc.add(node.id);
    if (node.type === "folder" && node.children?.length) {
      collectFileIds(node.children, acc);
    }
  });
}

function applyIconsToNodes(nodes: TreeNode[], iconsById: Record<string, string | null>): TreeNode[] {
  return nodes.map((node) => {
    const next: TreeNode = {
      ...node,
      icon: node.type === "file" ? iconsById[node.id] ?? node.icon ?? null : node.icon ?? null,
    };
    if (next.type === "folder" && next.children?.length) {
      next.children = applyIconsToNodes(next.children, iconsById);
    }
    return next;
  });
}

function applyIconOverrides(nodes: TreeNode[], overrides: Record<string, string | null>): TreeNode[] {
  return nodes.map((node) => {
    const hasOverride = Object.prototype.hasOwnProperty.call(overrides, node.id);
    const icon = node.type === "file"
      ? hasOverride
        ? overrides[node.id] ?? null
        : node.icon ?? null
      : node.icon ?? null;

    const next: TreeNode = {
      ...node,
      icon,
    };

    if (next.type === "folder" && next.children?.length) {
      next.children = applyIconOverrides(next.children, overrides);
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

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 600;
const SIDEBAR_COLLAPSED_WIDTH = 48;

export default function FileSidebar({
  collapsed = false,
  onToggleCollapsed,
  width = 256,
  onWidthChange,
  iconOverrides,
  onSelectFile,
  onClearSelection,
  reloadKey,
  selectedNodePath,
  selectedNodeId,
}: {
  collapsed?: boolean;
  onToggleCollapsed: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
  iconOverrides?: Record<string, string | null>;
  onSelectFile?: (file: TreeNode, nodePath: string) => void;
  onClearSelection?: () => void;
  reloadKey?: unknown;
  selectedNodePath?: string | null;
  selectedNodeId?: string | null;
}) {
  const { theme } = useTheme();
  const { showSnackbar } = useSnackbar();
  const [collections, setCollections] = useState<TreeViewGroup[]>([]);
  const [subFileContentIds, setSubFileContentIds] = useState<Set<string>>(new Set());
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [isSavingCollection, setIsSavingCollection] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemType, setItemType] = useState<"file" | "folder">("file");
  const [fileFormat, setFileFormat] = useState<"md" | "datatable">("md");
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [selectedNodeForAdd, setSelectedNodeForAdd] = useState<{ node: TreeNode | null; path: string | null; groupIndex: number } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [selectedNodeForDelete, setSelectedNodeForDelete] = useState<{ node: TreeNode; path: string; groupIndex: number } | null>(null);
  const [isImportAzureModalOpen, setIsImportAzureModalOpen] = useState(false);
  const [azureMarkdownUrl, setAzureMarkdownUrl] = useState("");
  const [azureMarkdownName, setAzureMarkdownName] = useState("");
  const [azureAuthHeader, setAzureAuthHeader] = useState("");
  const [isImportingAzure, setIsImportingAzure] = useState(false);
  const [isAzureDevopsModalOpen, setIsAzureDevopsModalOpen] = useState(false);
  const [isLoadingAzureProjects, setIsLoadingAzureProjects] = useState(false);
  const [azureProjects, setAzureProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAzureProject, setSelectedAzureProject] = useState("");
  const [selectedAzureTeam, setSelectedAzureTeam] = useState("");
  const [azureTeams, setAzureTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingAzureTeams, setIsLoadingAzureTeams] = useState(false);
  const [isLoadingAzureBacklog, setIsLoadingAzureBacklog] = useState(false);
  const [azureBacklog, setAzureBacklog] = useState<BacklogNode[]>([]);
  const [azureCheckedUserStoryIds, setAzureCheckedUserStoryIds] = useState<number[]>([]);
  const [isImportingUserStoriesMd, setIsImportingUserStoriesMd] = useState(false);
  const [azurePatConfigured, setAzurePatConfigured] = useState<boolean | null>(null);

  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (collapsed) return;
      e.preventDefault();
      isResizingRef.current = true;
      startXRef.current = e.clientX;
      startWidthRef.current = width;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current) return;
        const delta = moveEvent.clientX - startXRef.current;
        const newWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, startWidthRef.current + delta));
        onWidthChange?.(newWidth);
      };

      const handleMouseUp = () => {
        isResizingRef.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [collapsed, width, onWidthChange],
  );

  const resolvedCollections = useMemo(() => {
    if (!iconOverrides || Object.keys(iconOverrides).length === 0) {
      return collections;
    }
    return collections.map((collection) => ({
      ...collection,
      directories: applyIconOverrides(collection.directories, iconOverrides),
    }));
  }, [collections, iconOverrides]);

  const reloadCollections = useCallback(async () => {
    const [collections, sfContentIds] = await Promise.all([
      findAllCollections(),
      getAllSubFileContentIds(),
    ]);

    setSubFileContentIds(new Set(sfContentIds));

    const hydratedCollections = collections.map((collection) => {
      const directories = assignCollectionId(
        parseDirectories(collection.directories),
        collection.id
      );

      return {
        id: collection.id,
        name: collection.name ?? "",
        directories,
      };
    });

    const fileIds = new Set<string>();
    hydratedCollections.forEach((collection) => {
      collectFileIds(collection.directories, fileIds);
    });

    const iconsById = fileIds.size > 0 ? await findFileIconsByIds([...fileIds]) : {};

    setCollections(
      hydratedCollections.map((collection) => ({
        ...collection,
        directories: applyIconsToNodes(collection.directories, iconsById),
      }))
    );
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingCollections(true);

    (async () => {
      try {
        await reloadCollections();
      } finally {
        if (isMounted) setIsLoadingCollections(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [reloadKey, reloadCollections]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const result = await hasAzurePatConfigured();
      if (!isMounted) return;
      setAzurePatConfigured(result.success ? result.configured : false);
    })();
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

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

  const handleNodeClick = (node: TreeNode, nodePath: string) => {
    if (node.type === "file") {
      onSelectFile?.(node, nodePath);
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
      showSnackbar({
        variant: "success",
        message: `Collection "${created.name ?? name}" added.`,
      });
    } catch (error) {
      console.error("Failed to create collection:", error);
      showSnackbar({
        variant: "error",
        message: "Failed to add collection. Please try again.",
      });
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

  const handleAddFile = (selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number, fileType: FileType) => {
    setSelectedNodeForAdd({ node: selectedNode, path: selectedNodePath, groupIndex });
    setItemType("file");
    setItemName("");
    setFileFormat(fileType);
    setIsAddItemModalOpen(true);
  };

  const handleAddFlow = async (flowName: string, selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number) => {
    const name = flowName.trim();
    if (!name) return;

    const resolvedName = name.includes(".") ? name : `${name}.flow`;

    const newItem: TreeNode = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : mockUuid(),
      name: resolvedName,
      tags: [],
      type: "file",
      collectionId: "",
      extension: "flow",
      content: null,
      createdAt: 0,
      updatedAt: 0,
    };

    const existingGroup = collections[groupIndex];
    if (!existingGroup) return;

    const updatedCollections: TreeViewGroup[] = JSON.parse(JSON.stringify(collections));
    const group = updatedCollections[groupIndex];
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

    if (!selectedNode || !selectedNodePath) {
      group.directories.push(newItem);
    } else if (selectedNode.type === "folder") {
      const folder = findNodeByPath(group.directories, selectedNodePath.split("/"));
      if (folder && folder.type === "folder") {
        folder.children = folder.children ?? [];
        folder.children.push(newItem);
      } else {
        group.directories.push(newItem);
      }
    } else {
      const pathSegments = selectedNodePath.split("/");
      if (pathSegments.length > 1) {
        const parent = findNodeByPath(group.directories, pathSegments.slice(0, -1));
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

    setCollections(updatedCollections);

    try {
      await updateCollectionDirectories(group.id, group.directories);
      showSnackbar({ variant: "success", message: `Flow "${name}" added.` });
    } catch (err) {
      console.error("Failed to add flow:", err);
      setCollections(collections);
      showSnackbar({ variant: "error", message: "Failed to add flow. Please try again." });
    }
  };

  const toggleAzureUserStoryCheck = useCallback((id: number) => {
    setAzureCheckedUserStoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleImportAzureMarkdown = async (selectedNode: TreeNode | null, selectedNodePath: string | null, groupIndex: number) => {
    // Repurposed: show Azure DevOps projects -> epics table.
    setSelectedNodeForAdd({ node: selectedNode, path: selectedNodePath, groupIndex });
    setIsAzureDevopsModalOpen(true);
    setSelectedAzureProject("");
    setSelectedAzureTeam("");
    setAzureTeams([]);
    setAzureBacklog([]);
    setAzureCheckedUserStoryIds([]);

    setIsLoadingAzureProjects(true);
    try {
      const res = await fetch("/api/azure/devops/projects", { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as unknown;
      const parsed = payload as { success?: boolean; error?: string; projects?: Array<{ id: string; name: string }> } | null;
      if (!res.ok || !parsed?.success) {
        throw new Error(parsed?.error || `Failed to load projects (HTTP ${res.status})`);
      }
      setAzureProjects(parsed.projects ?? []);
    } catch (err) {
      console.error("Failed to load Azure DevOps projects:", err);
      showSnackbar({
        variant: "error",
        message: err instanceof Error ? err.message : "Failed to load Azure DevOps projects",
      });
      setAzureProjects([]);
    } finally {
      setIsLoadingAzureProjects(false);
    }
  };

  const handleCloseAzureDevopsModal = () => {
    if (isImportingUserStoriesMd) return;
    setIsAzureDevopsModalOpen(false);
    setSelectedAzureProject("");
    setSelectedAzureTeam("");
    setAzureProjects([]);
    setAzureTeams([]);
    setAzureBacklog([]);
    setAzureCheckedUserStoryIds([]);
    setIsLoadingAzureProjects(false);
    setIsLoadingAzureTeams(false);
    setIsLoadingAzureBacklog(false);
  };

  const fetchAzureTeams = useCallback(
    async (project: string) => {
      const p = project.trim();
      if (!p) return [];
      if (!azureProjects.some((x) => x.name === p)) return [];

      setIsLoadingAzureTeams(true);
      try {
        const res = await fetch(`/api/azure/devops/teams?project=${encodeURIComponent(p)}`, { cache: "no-store" });
        const payload = (await res.json().catch(() => null)) as {
          success?: boolean;
          error?: string;
          teams?: Array<{ id: string; name: string }>;
        } | null;
        if (!res.ok || !payload?.success) {
          throw new Error(payload?.error || `Failed to load teams (HTTP ${res.status})`);
        }
        const teams = payload.teams ?? [];
        setAzureTeams(teams);
        return teams;
      } catch (err) {
        console.error("Failed to load Azure DevOps teams:", err);
        showSnackbar({
          variant: "error",
          message: err instanceof Error ? err.message : "Failed to load Azure DevOps teams",
        });
        setAzureTeams([]);
        return [];
      } finally {
        setIsLoadingAzureTeams(false);
      }
    },
    [azureProjects, showSnackbar],
  );

  const fetchAzureBacklog = useCallback(
    async (project: string, team: string) => {
      const p = project.trim();
      const t = team.trim();
      if (!p || !t) return;
      if (!azureProjects.some((x) => x.name === p)) return;

      setIsLoadingAzureBacklog(true);
      setAzureBacklog([]);
      try {
        const res = await fetch("/api/azure/devops/workitems", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project: p, team: t }),
        });
        const payload = (await res.json().catch(() => null)) as unknown;
        const parsed = payload as { success?: boolean; error?: string; workItems?: BacklogNode[] } | null;
        if (!res.ok || !parsed?.success) {
          throw new Error(parsed?.error || `Failed to load backlog (HTTP ${res.status})`);
        }
        setAzureBacklog(parsed.workItems ?? []);
      } catch (err) {
        console.error("Failed to load Azure DevOps backlog:", err);
        showSnackbar({
          variant: "error",
          message: err instanceof Error ? err.message : "Failed to load Azure DevOps backlog",
        });
        setAzureBacklog([]);
      } finally {
        setIsLoadingAzureBacklog(false);
      }
    },
    [azureProjects, showSnackbar],
  );

  const handleChangeSelectedAzureProject = async (project: string) => {
    setSelectedAzureProject(project);
    setAzureCheckedUserStoryIds([]);
    setAzureBacklog([]);
    setAzureTeams([]);
    setSelectedAzureTeam("");

    if (!project) return;
    if (!azureProjects.some((p) => p.name === project)) return;

    const teams = await fetchAzureTeams(project);
    const defaultTeamName = `${project.trim()} Team`;
    const nextTeam =
      teams.find((t) => t.name === defaultTeamName)?.name ?? teams[0]?.name ?? defaultTeamName;

    setSelectedAzureTeam(nextTeam);
    await fetchAzureBacklog(project, nextTeam);
  };

  const handleChangeSelectedAzureTeam = async (team: string) => {
    setSelectedAzureTeam(team);
    setAzureCheckedUserStoryIds([]);
    if (!selectedAzureProject) return;
    await fetchAzureBacklog(selectedAzureProject, team);
  };

  const handleImportUserStoriesToMd = async () => {
    if (isImportingUserStoriesMd || azureCheckedUserStoryIds.length === 0) return;
    const project = selectedAzureProject.trim();
    if (!project) {
      showSnackbar({ variant: "error", message: "Select an Azure DevOps project first." });
      return;
    }

    const targetGroupIndex = selectedNodeForAdd?.groupIndex ?? 0;
    const existingGroup = collections[targetGroupIndex];
    if (!existingGroup) {
      showSnackbar({ variant: "error", message: "No collection available." });
      return;
    }

    setIsImportingUserStoriesMd(true);
    try {
      const detailsRes = await fetch("/api/azure/devops/workitems-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, ids: azureCheckedUserStoryIds }),
      });
      const detailsPayload = (await detailsRes.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
        items?: Array<{ id: number; title: string; descriptionHtml: string }>;
      } | null;
      if (!detailsRes.ok || !detailsPayload?.success || !Array.isArray(detailsPayload.items)) {
        throw new Error(detailsPayload?.error || `Failed to load work items (HTTP ${detailsRes.status})`);
      }

      const folderName = `user-stories-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
      const importFolderId =
        typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : mockUuid();
      const childFiles: TreeNode[] = [];

      for (const item of detailsPayload.items) {
        const mdRes = await fetch("/api/ai/html-to-markdown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            html: item.descriptionHtml,
            title: item.title,
            workItemId: item.id,
            project,
          }),
        });
        const mdPayload = (await mdRes.json().catch(() => null)) as {
          success?: boolean;
          error?: string;
          markdown?: string;
        } | null;
        if (!mdRes.ok || !mdPayload?.success || typeof mdPayload.markdown !== "string") {
          throw new Error(mdPayload?.error || `Failed to convert work item #${item.id} to Markdown`);
        }

        const fileName = sanitizeUserStoryMdFilename(item.title, item.id);
        const saveResult = await fileService.saveFile({
          id: null,
          name: fileName,
          collectionId: existingGroup.id,
          content: mdPayload.markdown,
          tags: [],
        });

        childFiles.push({
          id:
            saveResult.id ??
            (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : mockUuid()),
          name: fileName,
          tags: [],
          type: "file",
          collectionId: existingGroup.id,
          extension: "md",
          content: null,
          createdAt: 0,
          updatedAt: 0,
        });
      }

      const newFolder: TreeNode = {
        id: importFolderId,
        name: folderName,
        tags: [],
        type: "folder",
        children: childFiles,
        collectionId: existingGroup.id,
        extension: null,
        content: null,
        createdAt: 0,
        updatedAt: 0,
      };

      const updatedCollections: TreeViewGroup[] = JSON.parse(JSON.stringify(collections));
      const group = updatedCollections[targetGroupIndex];
      const pathSegments = (selectedNodeForAdd?.path ?? "")
        .split("/")
        .map((s) => s.trim())
        .filter(Boolean);
      const selectedNode = selectedNodeForAdd?.node ?? null;
      const selectedType =
        selectedNode?.type === "folder" || selectedNode?.type === "file" ? selectedNode.type : null;

      const parentList = getSiblingContainerList(group.directories, pathSegments, selectedType);
      parentList.push(newFolder);

      setCollections(updatedCollections);
      await updateCollectionDirectories(group.id, group.directories);
      setAzureCheckedUserStoryIds([]);
      setIsImportingUserStoriesMd(false);
      handleCloseAzureDevopsModal();
      showSnackbar({
        variant: "success",
        message: `Imported ${childFiles.length} user stor${childFiles.length === 1 ? "y" : "ies"} into folder "${folderName}".`,
      });
    } catch (err) {
      console.error("Failed to import user stories to Markdown:", err);
      showSnackbar({
        variant: "error",
        message: err instanceof Error ? err.message : "Failed to import user stories.",
      });
    } finally {
      setIsImportingUserStoriesMd(false);
    }
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
    setFileFormat("md");
    setSelectedNodeForAdd(null);
  };

  const handleCloseImportAzureModal = () => {
    if (isImportingAzure) return;
    setIsImportAzureModalOpen(false);
    setAzureMarkdownUrl("");
    setAzureMarkdownName("");
    setAzureAuthHeader("");
    setSelectedNodeForAdd(null);
  };

  const guessNameFromUrl = (url: string) => {
    try {
      const u = new URL(url);
      const last = u.pathname.split("/").filter(Boolean).pop() ?? "";
      if (!last) return "";
      return decodeURIComponent(last);
    } catch {
      return "";
    }
  };

  const handleAddItem = async () => {
    const name = itemName.trim();
    if (!name || isSavingItem) return;
    if (!selectedNodeForAdd) return;

    const resolvedExtension = itemType === "file" ? fileFormat : null;
    const resolvedName = itemType === "file" && !name.includes(".")
      ? `${name}.${fileFormat}`
      : name;

    const newItem: TreeNode = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : mockUuid(),
      name: resolvedName,
      tags: [],
      type: itemType,
      ...(itemType === "folder" ? { children: [] } : {}),
      collectionId: "",
      extension: resolvedExtension,
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
      showSnackbar({
        variant: "success",
        message: `${itemType === "file" ? "File" : "Folder"} "${name}" added.`,
      });
    } catch (err) {
      console.error("Failed to update collection directories:", err);
      // Best-effort rollback (to pre-click UI state)
      setCollections(collections);
      showSnackbar({
        variant: "error",
        message: `Failed to add ${itemType}. Please try again.`,
      });
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleSubmitAzureImport = async () => {
    const url = azureMarkdownUrl.trim();
    if (!url || isImportingAzure) return;
    if (!selectedNodeForAdd) return;

    const targetGroupIndex = selectedNodeForAdd.groupIndex ?? 0;
    const existingGroup = collections[targetGroupIndex];
    if (!existingGroup) return;

    setIsImportingAzure(true);
    try {
      const response = await fetch("/api/azure/markdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          authorization: azureAuthHeader.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as unknown;
        const parsed = payload as { error?: string } | null;
        throw new Error(parsed?.error || `Failed to fetch markdown (HTTP ${response.status})`);
      }

      const payload = (await response.json()) as { success: boolean; content?: string; error?: string };
      if (!payload.success || typeof payload.content !== "string") {
        throw new Error(payload.error || "Failed to fetch markdown");
      }

      const resolvedNameRaw = azureMarkdownName.trim() || guessNameFromUrl(url) || "imported.md";
      const resolvedName = resolvedNameRaw.toLowerCase().endsWith(".md") ? resolvedNameRaw : `${resolvedNameRaw}.md`;

      // Persist file content to DB first so we can use its id in the tree.
      const saveResult = await fileService.saveFile({
        id: null,
        name: resolvedName,
        collectionId: existingGroup.id,
        content: payload.content,
        tags: [],
      });

      const newItem: TreeNode = {
        id: saveResult.id ?? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : mockUuid()),
        name: resolvedName,
        tags: [],
        type: "file",
        collectionId: existingGroup.id,
        extension: "md",
        content: null,
        createdAt: 0,
        updatedAt: 0,
      };

      const updatedCollections: TreeViewGroup[] = JSON.parse(JSON.stringify(collections)); // Deep clone
      const group = updatedCollections[targetGroupIndex];

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
        const selected = selectedNodeForAdd.node;
        const pathSegments = selectedNodeForAdd.path.split("/");

        if (selected.type === "folder") {
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
      handleCloseImportAzureModal();

      await updateCollectionDirectories(group.id, group.directories);
      showSnackbar({
        variant: "success",
        message: `Imported "${resolvedName}" from Azure.`,
      });
    } catch (err) {
      console.error("Failed to import markdown from Azure:", err);
      showSnackbar({
        variant: "error",
        message: err instanceof Error ? err.message : "Failed to import markdown. Please try again.",
      });
    } finally {
      setIsImportingAzure(false);
    }
  };

  const handleRequestDeleteNode = (node: TreeNode, nodePath: string, groupIndex: number) => {
    setSelectedNodeForDelete({ node, path: nodePath, groupIndex });
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (isDeletingItem) return;
    setIsDeleteModalOpen(false);
    setSelectedNodeForDelete(null);
  };

  const removeNodeByIdInPlace = (nodes: TreeNode[], nodeId: string): boolean => {
    const index = nodes.findIndex((item) => item.id === nodeId);
    if (index !== -1) {
      nodes.splice(index, 1);
      return true;
    }

    for (const node of nodes) {
      if (node.type === "folder" && node.children?.length) {
        const removed = removeNodeByIdInPlace(node.children, nodeId);
        if (removed) return true;
      }
    }

    return false;
  };

  const handleConfirmDelete = async () => {
    if (!selectedNodeForDelete || isDeletingItem) return;

    const target = selectedNodeForDelete;
    if (target.node.type === "folder" && (target.node.children?.length ?? 0) > 0) {
      showSnackbar({
        variant: "error",
        message: "Folder is not empty. Remove items before deleting.",
      });
      return;
    }
    const targetGroupIndex = selectedNodeForDelete.groupIndex ?? 0;
    const existingGroup = collections[targetGroupIndex];
    if (!existingGroup) return;

    const previousCollections = collections;
    const updatedCollections: TreeViewGroup[] = JSON.parse(JSON.stringify(collections));
    const group = updatedCollections[targetGroupIndex];
    const removed = removeNodeByIdInPlace(group.directories, selectedNodeForDelete.node.id);

    if (!removed) {
      handleCloseDeleteModal();
      return;
    }

    setCollections(updatedCollections);
    setIsDeleteModalOpen(false);
    setSelectedNodeForDelete(null);

    setIsDeletingItem(true);
    try {
      if (target.node.type === "file") {
        const delRes = await fetch(`/api/file?id=${encodeURIComponent(target.node.id)}`, {
          method: "DELETE",
        });
        const delPayload = (await delRes.json().catch(() => null)) as {
          success?: boolean;
          error?: string;
        } | null;
        if (!delRes.ok || !delPayload?.success) {
          throw new Error(delPayload?.error || `Failed to delete file (HTTP ${delRes.status})`);
        }
      }

      await updateCollectionDirectories(group.id, group.directories);

      // If the currently selected node was deleted, clear selection in the parent.
      const deletedPath = target.path;
      const currentPath = selectedNodePath;
      if (currentPath && (currentPath === deletedPath || currentPath.startsWith(`${deletedPath}/`))) {
        onClearSelection?.();
      }

      // Ensure the sidebar reflects the canonical persisted state.
      // (e.g. handles any server-side normalization and refreshes icons)
      setIsLoadingCollections(true);
      await reloadCollections();
      showSnackbar({
        variant: "success",
        message: `${target.node.type === "file" ? "File" : "Folder"} "${target.node.name}" deleted.`,
      });
    } catch (err) {
      console.error("Failed to delete item:", err);
      setCollections(previousCollections);
      showSnackbar({
        variant: "error",
        message: `Failed to delete ${target.node.type}. Please try again.`,
      });
    } finally {
      setIsLoadingCollections(false);
      setIsDeletingItem(false);
    }
  };

  const footerButtonLabel = collapsed ? "Show sidebar" : "Hide sidebar";

  return (
    <>
      <aside
        className={[
          "relative flex flex-col h-[calc(100vh-4rem)] overflow-hidden",
          "border-r",
          theme === "light" ? "bg-white border-gray-200" : "bg-gray-900 border-gray-800",
        ].join(" ")}
        style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : width, transition: isResizingRef.current ? "none" : "width 200ms" }}
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
                data={resolvedCollections}
                onNodeClick={handleNodeClick}
                onAddFile={handleAddFile}
                onAddFolder={handleAddFolder}
                onAddFlow={handleAddFlow}
                onImportAzureMarkdown={handleImportAzureMarkdown}
                azurePatConfigured={azurePatConfigured}
                onRequestDeleteNode={handleRequestDeleteNode}
                selectedNodePath={selectedNodePath}
                selectedNodeId={selectedNodeId}
                subFileContentIds={subFileContentIds}
              />
            )}
          </div>
        </div>

        {!collapsed && (
          <div
            onMouseDown={handleResizeStart}
            className={[
              "absolute top-0 right-0 w-1 h-full cursor-col-resize z-10 transition-colors",
              theme === "light"
                ? "hover:bg-blue-400/60 active:bg-blue-500/80"
                : "hover:bg-blue-500/60 active:bg-blue-400/80",
            ].join(" ")}
          />
        )}
      </aside>

      <FileSidebarModals
        theme={theme}
        isCollectionModalOpen={isModalOpen}
        onCloseCollectionModal={handleCloseModal}
        collectionName={collectionName}
        onChangeCollectionName={setCollectionName}
        onSubmitCollection={handleAddCollection}
        isSavingCollection={isSavingCollection}
        isAddItemModalOpen={isAddItemModalOpen}
        onCloseAddItemModal={handleCloseAddItemModal}
        itemType={itemType}
        itemName={itemName}
        onChangeItemName={setItemName}
        fileFormat={fileFormat}
        onSubmitItem={handleAddItem}
        isSavingItem={isSavingItem}
        selectedNodeForAdd={selectedNodeForAdd}
        isAzureDevopsModalOpen={isAzureDevopsModalOpen}
        onCloseAzureDevopsModal={handleCloseAzureDevopsModal}
        azureProjects={azureProjects}
        selectedAzureProject={selectedAzureProject}
        onChangeSelectedAzureProject={handleChangeSelectedAzureProject}
        selectedAzureTeam={selectedAzureTeam}
        onChangeSelectedAzureTeam={handleChangeSelectedAzureTeam}
          azureTeams={azureTeams}
          isLoadingAzureTeams={isLoadingAzureTeams}
        azureBacklog={azureBacklog}
        isLoadingAzureProjects={isLoadingAzureProjects}
        isLoadingAzureBacklog={isLoadingAzureBacklog}
        azureCheckedUserStoryIds={azureCheckedUserStoryIds}
        onToggleAzureUserStoryCheck={toggleAzureUserStoryCheck}
        onImportUserStoriesToMd={handleImportUserStoriesToMd}
        isImportingUserStoriesMd={isImportingUserStoriesMd}
        isImportAzureModalOpen={isImportAzureModalOpen}
        onCloseImportAzureModal={handleCloseImportAzureModal}
        azureMarkdownUrl={azureMarkdownUrl}
        onChangeAzureMarkdownUrl={setAzureMarkdownUrl}
        azureMarkdownName={azureMarkdownName}
        onChangeAzureMarkdownName={setAzureMarkdownName}
        azureAuthHeader={azureAuthHeader}
        onChangeAzureAuthHeader={setAzureAuthHeader}
        onSubmitAzureImport={handleSubmitAzureImport}
        isImportingAzure={isImportingAzure}
        isDeleteModalOpen={isDeleteModalOpen}
        onCloseDeleteModal={handleCloseDeleteModal}
        onConfirmDelete={handleConfirmDelete}
        isDeletingItem={isDeletingItem}
        selectedNodeForDelete={selectedNodeForDelete}
      />
    </>
  );
}

