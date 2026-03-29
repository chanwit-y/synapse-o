"use client";

import Modal from "./Modal";
import CustomSelect from "./CustomSelect";
import { ChevronDown, ChevronRight, Crown, Trophy, BookOpen, ClipboardCheck, Loader2 } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

export type BacklogNode = {
  id: number;
  title: string;
  state: string;
  workItemType: string;
  children: BacklogNode[];
};

const VISIBLE_AZURE_BACKLOG_TYPES = new Set<string>(["Epic", "Feature", "User Story"]);

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

function backlogTypeIcon(t: string) {
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
}

function BacklogNodeRows({
  theme,
  items,
  level,
  scopeKey,
  parentId,
  rootOrderById,
  openBelow,
  toggleBelow,
  selectedId,
  onSelectRow,
  childrenCache,
  loadingChildren,
  childErrors,
  getDisplayChildren,
  showExpandChevron,
  checkedUserStoryIds,
  onToggleUserStoryCheck,
}: {
  theme: string;
  items: BacklogNode[];
  level: number;
  scopeKey: string;
  parentId: number | null;
  rootOrderById: Map<number, number>;
  openBelow: Record<string, boolean>;
  toggleBelow: (rowKey: string, id: number) => void;
  selectedId: number | null;
  onSelectRow: (id: number) => void;
  childrenCache: Record<number, BacklogNode[]>;
  loadingChildren: Record<number, boolean>;
  childErrors: Record<number, string>;
  getDisplayChildren: (node: BacklogNode) => BacklogNode[];
  showExpandChevron: (node: BacklogNode) => boolean;
  checkedUserStoryIds: number[];
  onToggleUserStoryCheck: (id: number) => void;
}) {
  return (
    <>
      {items.map((node, siblingIndex) => {
        const expandable = showExpandChevron(node);
        const rowKey = `${scopeKey}:${parentId ?? "root"}:${node.id}:${siblingIndex}`;
        const panelId = `backlog-children-${rowKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
        const panelOpen = Boolean(openBelow[rowKey]);
        const isSelected = selectedId === node.id;
        const orderDisplay = level === 0 ? rootOrderById.get(node.id) ?? siblingIndex + 1 : "";
        const loaded = Object.prototype.hasOwnProperty.call(childrenCache, node.id);
        const loading = Boolean(loadingChildren[node.id]);
        const err = childErrors[node.id];
        const displayKids = getDisplayChildren(node);
        const rowBg =
          theme === "light"
            ? isSelected
              ? "bg-sky-100/80"
              : "bg-white hover:bg-gray-50/90"
            : isSelected
              ? "bg-sky-950/50"
              : "bg-gray-900/40 hover:bg-gray-800/60";

        const fetchingChildren = loading && !loaded;

        return (
          <Fragment key={rowKey}>
            <tr
              className={`${rowBg} border-b ${theme === "light" ? "border-gray-100" : "border-gray-700/80"} cursor-pointer`}
              aria-busy={fetchingChildren}
              onClick={() => {
                onSelectRow(node.id);
                if (expandable) toggleBelow(rowKey, node.id);
              }}
            >
              <td className={`px-3 py-1.5 align-middle text-right font-mono text-xs tabular-nums ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
                {orderDisplay}
              </td>
              <td className={`px-3 py-1.5 align-middle whitespace-nowrap ${theme === "light" ? "text-gray-800" : "text-gray-200"}`}>
                {node.workItemType}
              </td>
              <td className="px-3 py-1.5 align-middle min-w-0">
                <div className="flex items-center gap-1 min-w-0" style={{ paddingLeft: `${level * 12}px` }}>
                  {expandable ? (
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBelow(rowKey, node.id);
                        }}
                        className={
                          theme === "light"
                            ? "rounded p-0.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                            : "rounded p-0.5 text-gray-400 hover:bg-gray-700 hover:text-gray-100"
                        }
                        aria-controls={panelId}
                        aria-expanded={panelOpen}
                        aria-label={panelOpen ? "Collapse nested tree" : "Expand nested tree"}
                        title={panelOpen ? "Collapse nested tree" : "Expand nested tree"}
                      >
                        {panelOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </span>
                  ) : null}
                  {node.workItemType === "User Story" ? (
                    <input
                      type="checkbox"
                      checked={checkedUserStoryIds.includes(node.id)}
                      onChange={() => onToggleUserStoryCheck(node.id)}
                      onClick={(e) => e.stopPropagation()}
                      className={
                        theme === "light"
                          ? "h-4 w-4 mr-2 shrink-0 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          : "h-4 w-4 mr-2 shrink-0 cursor-pointer rounded border-gray-500 bg-gray-800 text-blue-500 focus:ring-blue-400"
                      }
                      aria-label={`Select user story: ${node.title}`}
                    />
                  ) : null}
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">{backlogTypeIcon(node.workItemType)}</span>
                  <span className={`min-w-0 flex-1 truncate ${theme === "light" ? "text-gray-900" : "text-gray-100"}`}>{node.title}</span>
                  {fetchingChildren ? (
                    <Loader2
                      className={`h-4 w-4 shrink-0 animate-spin ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}
                      aria-label="Loading children"
                    />
                  ) : null}
                </div>
              </td>
            </tr>
            {panelOpen && !fetchingChildren && (err || displayKids.length > 0) && (
              <tr id={panelId} className={theme === "light" ? "bg-white" : "bg-gray-900/20"}>
                <td colSpan={3} className={`p-0 align-top border-b ${theme === "light" ? "border-gray-100" : "border-gray-700/80"}`}>
                  {err ? (
                    <p className={`px-3 py-2 text-xs ${theme === "light" ? "text-red-700" : "text-red-400"}`}>{err}</p>
                  ) : (
                    <table className="w-full border-collapse text-sm table-fixed">
                      <colgroup>
                        <col className="w-14" />
                        <col className="w-38" />
                        <col />
                      </colgroup>
                      <tbody>
                        <BacklogNodeRows
                          theme={theme}
                          items={displayKids}
                          level={level + 1}
                          scopeKey={scopeKey}
                          parentId={node.id}
                          rootOrderById={rootOrderById}
                          openBelow={openBelow}
                          toggleBelow={toggleBelow}
                          selectedId={selectedId}
                          onSelectRow={onSelectRow}
                          childrenCache={childrenCache}
                          loadingChildren={loadingChildren}
                          childErrors={childErrors}
                          getDisplayChildren={getDisplayChildren}
                          showExpandChevron={showExpandChevron}
                          checkedUserStoryIds={checkedUserStoryIds}
                          onToggleUserStoryCheck={onToggleUserStoryCheck}
                        />
                      </tbody>
                    </table>
                  )}
                </td>
              </tr>
            )}
          </Fragment>
        );
      })}
    </>
  );
}

function BacklogTree({
  theme,
  nodes,
  isLoading,
  projectName,
  teamName,
  checkedUserStoryIds,
  onToggleUserStoryCheck,
}: {
  theme: string;
  nodes: BacklogNode[];
  isLoading: boolean;
  projectName: string;
  teamName: string;
  checkedUserStoryIds: number[];
  onToggleUserStoryCheck: (id: number) => void;
}) {
  const [openBelow, setOpenBelow] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [childrenCache, setChildrenCache] = useState<Record<number, BacklogNode[]>>({});
  const [loadingChildren, setLoadingChildren] = useState<Record<number, boolean>>({});
  const [childErrors, setChildErrors] = useState<Record<number, string>>({});

  const cacheRef = useRef<Record<number, BacklogNode[]>>({});
  const inFlightRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    cacheRef.current = childrenCache;
  }, [childrenCache]);

  useEffect(() => {
    setOpenBelow({});
    setSelectedId(null);
    setChildrenCache({});
    setLoadingChildren({});
    setChildErrors({});
    cacheRef.current = {};
    inFlightRef.current = new Set();
  }, [projectName, teamName]);

  const rootOrderById = useMemo(() => {
    const map = new Map<number, number>();
    nodes.forEach((n, idx) => map.set(n.id, idx + 1));
    return map;
  }, [nodes]);

  const loadChildrenFor = useCallback(async (parentId: number, rowKey: string) => {
    if (!projectName) return;
    if (cacheRef.current[parentId] !== undefined) return;
    if (inFlightRef.current.has(parentId)) return;
    inFlightRef.current.add(parentId);
    setLoadingChildren((l) => ({ ...l, [parentId]: true }));
    setChildErrors((e) => {
      const next = { ...e };
      delete next[parentId];
      return next;
    });
    try {
      const res = await fetch("/api/azure/devops/workitem-children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectName, workItemId: parentId }),
      });
      const payload = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
        children?: BacklogNode[];
      } | null;
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error || `Failed to load children (HTTP ${res.status})`);
      }
      const list = payload.children ?? [];
      setChildrenCache((c) => {
        const next = { ...c, [parentId]: list };
        cacheRef.current = next;
        return next;
      });
      if (list.length === 0) {
        setOpenBelow((o) => ({ ...o, [rowKey]: false }));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load children";
      setChildErrors((er) => ({ ...er, [parentId]: msg }));
      setChildrenCache((c) => {
        const next = { ...c, [parentId]: [] };
        cacheRef.current = next;
        return next;
      });
    } finally {
      inFlightRef.current.delete(parentId);
      setLoadingChildren((l) => ({ ...l, [parentId]: false }));
    }
  }, [projectName]);

  const toggleBelow = useCallback(
    (rowKey: string, id: number) => {
      setOpenBelow((prev) => {
        const opening = !prev[rowKey];
        if (opening && projectName) {
          void loadChildrenFor(id, rowKey);
        }
        return { ...prev, [rowKey]: opening };
      });
    },
    [projectName, loadChildrenFor],
  );

  const getDisplayChildren = useCallback(
    (n: BacklogNode) => {
      if (Object.prototype.hasOwnProperty.call(childrenCache, n.id)) {
        return childrenCache[n.id];
      }
      return n.children ?? [];
    },
    [childrenCache],
  );

  const showExpandChevron = useCallback(
    (n: BacklogNode) => {
      if (n.workItemType === "User Story") return false;
      if (Object.prototype.hasOwnProperty.call(childrenCache, n.id)) {
        return childrenCache[n.id].length > 0;
      }
      const canHaveChildren = n.workItemType === "Epic" || n.workItemType === "Feature";
      return (n.children?.length ?? 0) > 0 || canHaveChildren;
    },
    [childrenCache],
  );

  const thDivider =
    theme === "light" ? "border-r border-gray-200 last:border-r-0" : "border-r border-gray-600 last:border-r-0";
  const theadBg = theme === "light" ? "bg-[#fafafa]" : "bg-gray-800/90";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8">
        <Loader2 className={`h-5 w-5 animate-spin ${theme === "light" ? "text-blue-600" : "text-blue-400"}`} />
        <span className={theme === "light" ? "text-sm text-gray-600" : "text-sm text-gray-400"}>
          Loading backlog…
        </span>
      </div>
    );
  }

  return (
    <table className="w-full text-sm border-collapse table-fixed">
      <colgroup>
        <col className="w-14" />
        <col className="w-38" />
        <col />
      </colgroup>
      <thead className={`${theadBg} sticky top-0 z-10 border-b ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}>
        <tr className="text-left">
          <th className={`px-3 py-2 text-right font-semibold text-xs uppercase tracking-wide ${thDivider} ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
            Order
          </th>
          <th className={`px-3 py-2 font-semibold text-xs uppercase tracking-wide ${thDivider} ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
            Work Item Type
          </th>
          <th className={`px-3 py-2 font-semibold text-xs uppercase tracking-wide ${thDivider} ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
            Title
          </th>
        </tr>
      </thead>
      <tbody>
        {nodes.length === 0 ? (
          <tr>
            <td colSpan={3} className={theme === "light" ? "px-3 py-4 text-center text-gray-500" : "px-3 py-4 text-center text-gray-400"}>
              No items
            </td>
          </tr>
        ) : (
          <BacklogNodeRows
            theme={theme}
            items={nodes}
            level={0}
            scopeKey={`${projectName}::${teamName}`}
            parentId={null}
            rootOrderById={rootOrderById}
            openBelow={openBelow}
            toggleBelow={toggleBelow}
            selectedId={selectedId}
            onSelectRow={setSelectedId}
            childrenCache={childrenCache}
            loadingChildren={loadingChildren}
            childErrors={childErrors}
            getDisplayChildren={getDisplayChildren}
            showExpandChevron={showExpandChevron}
            checkedUserStoryIds={checkedUserStoryIds}
            onToggleUserStoryCheck={onToggleUserStoryCheck}
          />
        )}
      </tbody>
    </table>
  );
}

export type AzureBacklogModalProps = {
  theme: string;
  isOpen: boolean;
  onClose: () => void;
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
};

export default function AzureBacklogModal({
  theme,
  isOpen,
  onClose,
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
}: AzureBacklogModalProps) {
  const filteredAzureBacklog = useMemo(
    () => filterBacklogToVisibleTypes(azureBacklog),
    [azureBacklog]
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-4">
        <h3
          className={`text-lg font-semibold ${theme === "light" ? "text-gray-900" : "text-gray-100"
            }`}
        >
          Azure DevOps Backlog
        </h3>

        <div className="space-y-2">
          <label
            htmlFor="azure-project"
            className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"
              }`}
          >
            Project
          </label>

          <div className="relative">
            <CustomSelect
              value={selectedAzureProject}
              onChange={onChangeSelectedAzureProject}
              options={azureProjects.map((p) => ({ value: p.name, label: p.name }))}
              placeholder={isLoadingAzureProjects ? "Loading projects…" : "Select a project…"}
              disabled={isLoadingAzureProjects}
              theme={theme}
              ariaLabel="Select Azure project"
            />
            {isLoadingAzureProjects && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                <Loader2 className={`h-4 w-4 animate-spin ${theme === "light" ? "text-gray-400" : "text-gray-500"}`} />
              </div>
            )}
          </div>
        </div>

        {selectedAzureProject ? (
          <div className="space-y-2">
            <label
              htmlFor="azure-team"
              className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"
                }`}
            >
              Team
            </label>
            <div className="relative">
              <CustomSelect
                value={selectedAzureTeam}
                onChange={onChangeSelectedAzureTeam}
                options={azureTeams.map((t) => ({ value: t.name, label: t.name }))}
                placeholder={isLoadingAzureTeams ? "Loading teams…" : azureTeams.length === 0 ? "No teams found" : "Select a team…"}
                disabled={isLoadingAzureTeams || azureTeams.length === 0}
                theme={theme}
                ariaLabel="Select Azure team"
              />
              {isLoadingAzureTeams && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  <Loader2 className={`h-4 w-4 animate-spin ${theme === "light" ? "text-gray-400" : "text-gray-500"}`} />
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className={theme === "light" ? "text-sm font-semibold text-gray-800" : "text-sm font-semibold text-gray-200"}>
              Backlog
            </h4>
            {isLoadingAzureBacklog && (
              <span className={`inline-flex items-center gap-1.5 ${theme === "light" ? "text-xs text-gray-500" : "text-xs text-gray-400"}`}>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
                  key={`${selectedAzureProject}::${selectedAzureTeam}`}
                  theme={theme}
                  nodes={filteredAzureBacklog}
                  isLoading={isLoadingAzureBacklog}
                  projectName={selectedAzureProject}
                  teamName={selectedAzureTeam}
                  checkedUserStoryIds={azureCheckedUserStoryIds}
                  onToggleUserStoryCheck={onToggleAzureUserStoryCheck}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isImportingUserStoriesMd}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${theme === "light"
                ? "text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                : "text-gray-300 bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
              }`}
          >
            Close
          </button>
          <button
            type="button"
            onClick={onImportUserStoriesToMd}
            disabled={isImportingUserStoriesMd || !selectedAzureProject || azureCheckedUserStoryIds.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            {isImportingUserStoriesMd ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                Importing…
              </>
            ) : (
              "Import to .md"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
