import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import {
  CONDITION_OPERATORS,
  DEFAULT_ROOT_GROUP,
  type ConditionGroup,
  type ConditionItem,
  type ConditionOperator,
  type ConditionRule,
  type Variable,
} from "./types";

// ── Tree utilities ──────────────────────────────────────────────────

function updateInTree(
  group: ConditionGroup,
  targetId: string,
  updater: (item: ConditionItem) => ConditionItem,
): ConditionGroup {
  return {
    ...group,
    children: group.children.map((child) => {
      if (child.id === targetId) return updater(child);
      if (child.type === "group") return updateInTree(child, targetId, updater);
      return child;
    }),
  };
}

function removeFromTree(group: ConditionGroup, targetId: string): ConditionGroup {
  return {
    ...group,
    children: group.children
      .filter((child) => child.id !== targetId)
      .map((child) =>
        child.type === "group" ? removeFromTree(child, targetId) : child,
      ),
  };
}

function addChildToGroup(
  tree: ConditionGroup,
  groupId: string,
  newItem: ConditionItem,
): ConditionGroup {
  if (tree.id === groupId) {
    return { ...tree, children: [...tree.children, newItem] };
  }
  return {
    ...tree,
    children: tree.children.map((child) =>
      child.type === "group" ? addChildToGroup(child, groupId, newItem) : child,
    ),
  };
}

// ── Dropdowns ───────────────────────────────────────────────────────

function FieldDropdown({
  value,
  nodeId,
  onChange,
  isDark,
}: {
  value: string;
  nodeId: string;
  onChange: (field: string) => void;
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<Variable[]>([]);
  const { getNodes, getEdges } = useReactFlow();
  const ref = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    if (!open) {
      const edges = getEdges();
      const nodes = getNodes();
      const incoming = edges.filter((e) => e.target === nodeId);
      const vars: Variable[] = [];
      for (const edge of incoming) {
        const src = nodes.find((n) => n.id === edge.source);
        if (src?.data?.type === "input" && Array.isArray(src?.data?.variables)) {
          vars.push(...(src.data.variables as Variable[]));
        }
      }
      setFields(vars);
    }
    setOpen((o) => !o);
  }, [open, nodeId, getNodes, getEdges]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="nodrag nowheel relative">
      <button
        type="button"
        onClick={handleToggle}
        className={[
          "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors max-w-[72px]",
          isDark
            ? "bg-gray-600/60 text-gray-300 hover:bg-gray-500/60"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          !value && (isDark ? "text-gray-500" : "text-gray-400"),
        ].join(" ")}
      >
        <span className="truncate">{value || "field"}</span>
        <ChevronDown size={9} className="shrink-0" />
      </button>
      {open && (
        <div
          className={[
            "absolute left-0 top-full z-50 mt-1 min-w-[110px] rounded-md border py-1 shadow-lg",
            isDark ? "border-gray-600 bg-gray-800" : "border-gray-200 bg-white",
          ].join(" ")}
        >
          {fields.length === 0 ? (
            <div
              className={[
                "px-2.5 py-1.5 text-[10px] italic",
                isDark ? "text-gray-500" : "text-gray-400",
              ].join(" ")}
            >
              No input variables
            </div>
          ) : (
            fields.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onChange(f.name);
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center justify-between px-2.5 py-1 text-[10px] font-medium",
                  f.name === value ? "opacity-100" : "opacity-60",
                  isDark
                    ? "text-gray-300 hover:bg-gray-700"
                    : "text-gray-700 hover:bg-gray-100",
                ].join(" ")}
              >
                <span className="truncate">{f.name}</span>
                <span
                  className={[
                    "ml-1 text-[9px]",
                    isDark ? "text-gray-500" : "text-gray-400",
                  ].join(" ")}
                >
                  {f.dataType}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function OperatorDropdown({
  value,
  onChange,
  isDark,
}: {
  value: ConditionOperator;
  onChange: (op: ConditionOperator) => void;
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="nodrag nowheel relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          "flex items-center justify-center rounded px-1 py-0.5 text-[10px] font-mono font-bold transition-colors min-w-[26px]",
          isDark
            ? "bg-gray-600/60 text-amber-400 hover:bg-gray-500/60"
            : "bg-amber-50 text-amber-600 hover:bg-amber-100",
        ].join(" ")}
      >
        {value}
      </button>
      {open && (
        <div
          className={[
            "absolute left-1/2 -translate-x-1/2 top-full z-50 mt-1 rounded-md border py-1 shadow-lg",
            isDark ? "border-gray-600 bg-gray-800" : "border-gray-200 bg-white",
          ].join(" ")}
        >
          {CONDITION_OPERATORS.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => {
                onChange(op);
                setOpen(false);
              }}
              className={[
                "flex w-full items-center justify-center px-3 py-1 text-[10px] font-mono font-bold",
                op === value ? "opacity-100" : "opacity-60",
                isDark
                  ? "text-amber-400 hover:bg-gray-700"
                  : "text-amber-600 hover:bg-gray-100",
              ].join(" ")}
            >
              {op}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Recursive group view ────────────────────────────────────────────

function ConditionGroupView({
  group,
  nodeId,
  isDark,
  depth,
  onUpdateRule,
  onAddRule,
  onAddGroup,
  onRemoveItem,
  onToggleLogic,
  onRemoveGroup,
}: {
  group: ConditionGroup;
  nodeId: string;
  isDark: boolean;
  depth: number;
  onUpdateRule: (ruleId: string, patch: Partial<ConditionRule>) => void;
  onAddRule: (groupId: string) => void;
  onAddGroup: (groupId: string) => void;
  onRemoveItem: (itemId: string) => void;
  onToggleLogic: (groupId: string) => void;
  onRemoveGroup?: () => void;
}) {
  const depthBorders = [
    isDark ? "border-blue-500/40" : "border-blue-300",
    isDark ? "border-purple-500/40" : "border-purple-300",
    isDark ? "border-green-500/40" : "border-green-300",
  ];

  return (
    <div
      className={[
        "flex flex-col gap-1",
        depth > 0 ? `border-l-2 ${depthBorders[depth % depthBorders.length]} pl-2 ml-0.5` : "",
      ].join(" ")}
    >
      {group.children.map((child, idx) => (
        <div key={child.id}>
          {idx > 0 && (
            <button
              type="button"
              onClick={() => onToggleLogic(group.id)}
              className={[
                "nodrag nowheel my-0.5 rounded px-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors",
                group.logic === "AND"
                  ? isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-500"
                  : isDark ? "text-orange-400 hover:text-orange-300" : "text-orange-600 hover:text-orange-500",
              ].join(" ")}
            >
              {group.logic}
            </button>
          )}
          {child.type === "rule" ? (
            <div
              className={[
                "nodrag nowheel flex items-center gap-1 rounded px-1.5 py-1",
                isDark ? "bg-gray-700/40" : "bg-gray-50",
              ].join(" ")}
            >
              <FieldDropdown
                value={child.field}
                nodeId={nodeId}
                onChange={(f) => onUpdateRule(child.id, { field: f })}
                isDark={isDark}
              />
              <OperatorDropdown
                value={child.operator}
                onChange={(op) => onUpdateRule(child.id, { operator: op })}
                isDark={isDark}
              />
              <input
                value={child.value}
                onChange={(e) => onUpdateRule(child.id, { value: e.target.value })}
                placeholder="value"
                className={[
                  "nodrag nowheel w-[50px] min-w-0 rounded px-1 py-0.5 text-[10px] font-medium outline-none",
                  isDark
                    ? "bg-gray-600/40 text-gray-200 placeholder:text-gray-500"
                    : "bg-white text-gray-700 placeholder:text-gray-400 border border-gray-200",
                ].join(" ")}
              />
              <button
                type="button"
                onClick={() => onRemoveItem(child.id)}
                className={[
                  "shrink-0 rounded p-0.5 transition-colors",
                  isDark
                    ? "text-gray-500 hover:text-red-400"
                    : "text-gray-400 hover:text-red-500",
                ].join(" ")}
              >
                <Trash2 size={10} />
              </button>
            </div>
          ) : (
            <ConditionGroupView
              group={child}
              nodeId={nodeId}
              isDark={isDark}
              depth={depth + 1}
              onUpdateRule={onUpdateRule}
              onAddRule={onAddRule}
              onAddGroup={onAddGroup}
              onRemoveItem={onRemoveItem}
              onToggleLogic={onToggleLogic}
              onRemoveGroup={() => onRemoveItem(child.id)}
            />
          )}
        </div>
      ))}
      <div className="flex items-center gap-1 mt-0.5">
        <button
          type="button"
          onClick={() => onAddRule(group.id)}
          className={[
            "nodrag nowheel flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
            isDark
              ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700/40"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
          ].join(" ")}
        >
          <Plus size={10} />
          Rule
        </button>
        <button
          type="button"
          onClick={() => onAddGroup(group.id)}
          className={[
            "nodrag nowheel flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
            isDark
              ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700/40"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
          ].join(" ")}
        >
          <Plus size={10} />
          ( )
        </button>
        {onRemoveGroup && (
          <button
            type="button"
            onClick={onRemoveGroup}
            className={[
              "nodrag nowheel ml-auto rounded p-0.5 transition-colors",
              isDark
                ? "text-gray-500 hover:text-red-400"
                : "text-gray-400 hover:text-red-500",
            ].join(" ")}
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Public component ────────────────────────────────────────────────

export function ConditionBody({
  nodeId,
  conditions,
  isDark,
}: {
  nodeId: string;
  conditions: ConditionGroup;
  isDark: boolean;
}) {
  const { setNodes } = useReactFlow();

  const setConditions = useCallback(
    (updater: (prev: ConditionGroup) => ConditionGroup) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const current =
            (n.data.conditions as ConditionGroup) || { ...DEFAULT_ROOT_GROUP };
          return {
            ...n,
            data: { ...n.data, conditions: updater(current) },
          };
        }),
      );
    },
    [nodeId, setNodes],
  );

  const handleUpdateRule = useCallback(
    (ruleId: string, patch: Partial<ConditionRule>) => {
      setConditions((prev) =>
        updateInTree(prev, ruleId, (item) => {
          if (item.type !== "rule") return item;
          return { ...item, ...patch };
        }),
      );
    },
    [setConditions],
  );

  const handleAddRule = useCallback(
    (groupId: string) => {
      const newRule: ConditionRule = {
        id: `rule-${Date.now()}`,
        type: "rule",
        field: "",
        operator: "==",
        value: "",
      };
      setConditions((prev) => addChildToGroup(prev, groupId, newRule));
    },
    [setConditions],
  );

  const handleAddGroup = useCallback(
    (parentGroupId: string) => {
      const newGroup: ConditionGroup = {
        id: `grp-${Date.now()}`,
        type: "group",
        logic: "AND",
        children: [],
      };
      setConditions((prev) => addChildToGroup(prev, parentGroupId, newGroup));
    },
    [setConditions],
  );

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      setConditions((prev) => removeFromTree(prev, itemId));
    },
    [setConditions],
  );

  const handleToggleLogic = useCallback(
    (groupId: string) => {
      setConditions((prev) => {
        if (prev.id === groupId) {
          return { ...prev, logic: prev.logic === "AND" ? "OR" : "AND" };
        }
        return updateInTree(prev, groupId, (item) =>
          item.type === "group"
            ? { ...item, logic: (item as ConditionGroup).logic === "AND" ? "OR" : "AND" }
            : item,
        );
      });
    },
    [setConditions],
  );

  return (
    <ConditionGroupView
      group={conditions}
      nodeId={nodeId}
      isDark={isDark}
      depth={0}
      onUpdateRule={handleUpdateRule}
      onAddRule={handleAddRule}
      onAddGroup={handleAddGroup}
      onRemoveItem={handleRemoveItem}
      onToggleLogic={handleToggleLogic}
    />
  );
}
