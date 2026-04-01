import {
  Handle,
  Position,
  useReactFlow,
  type NodeProps,
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "../ThemeProvider";

const NODE_TYPES = ["input", "condition", "process", "output"] as const;
type NodeType = (typeof NODE_TYPES)[number];

const typeIcons: Record<NodeType, React.ReactNode> = {
  input: (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5 shrink-0">
      <path d="M2 8h10M9 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  condition: (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5 shrink-0">
      <path d="M8 2L14 8L8 14L2 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  process: (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5 shrink-0">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  output: (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5 shrink-0">
      <path d="M4 8h10M11 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

function TypeDropdown({
  value,
  onChange,
  isDark,
}: {
  value: NodeType;
  onChange: (t: NodeType) => void;
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setOpen((o) => !o), []);

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
        onClick={toggle}
        className={[
          "flex items-center gap-1 rounded p-0.5 transition-colors",
          isDark ? "hover:bg-gray-600/60" : "hover:bg-gray-200/60",
        ].join(" ")}
      >
        {typeIcons[value]}
      </button>
      {open && (
        <div
          className={[
            "absolute left-0 top-full z-50 mt-1 min-w-[120px] rounded-md border py-1 shadow-lg",
            isDark
              ? "border-gray-600 bg-gray-800"
              : "border-gray-200 bg-white",
          ].join(" ")}
        >
          {NODE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
              className={[
                "flex w-full items-center gap-2 px-2.5 py-1.5 text-[11px] font-medium capitalize",
                t === value ? "opacity-100" : "opacity-60",
                isDark
                  ? "text-gray-300 hover:bg-gray-700"
                  : "text-gray-700 hover:bg-gray-100",
              ].join(" ")}
            >
              {typeIcons[t]}
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CustomNode({ id, data }: NodeProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { setNodes } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const currentType = (NODE_TYPES.includes(data.type as NodeType)
    ? data.type
    : "process") as NodeType;

  const handleTypeChange = useCallback(
    (newType: NodeType) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, type: newType } } : n)),
      );
    },
    [id, setNodes],
  );

  const title = (data.title as string) || currentType;

  const startEditing = useCallback(() => {
    setDraft(title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }, [title]);

  const commitEdit = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== title) {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, title: trimmed } } : n)),
      );
    }
    setEditing(false);
  }, [draft, title, id, setNodes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") commitEdit();
      if (e.key === "Escape") setEditing(false);
    },
    [commitEdit],
  );

  return (
    <div
      className={[
        "rounded-md border shadow-sm min-w-[180px] overflow-visible",
        isDark
          ? "border-gray-600 bg-gray-800 text-gray-100"
          : "border-gray-200 bg-white text-gray-800",
      ].join(" ")}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={isDark ? "bg-gray-400!" : "bg-gray-500!"}
      />
      <div
        className={[
          "flex items-center gap-2 px-2 py-1.5",
          isDark
            ? "border-b border-gray-700 bg-gray-700/60 text-gray-400 rounded-t-md"
            : "border-b border-gray-100 bg-gray-50 text-gray-500 rounded-t-md",
        ].join(" ")}
      >
        <TypeDropdown value={currentType} onChange={handleTypeChange} isDark={isDark} />
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className={[
              "nodrag nowheel w-full min-w-0 bg-transparent text-[10px] font-semibold uppercase tracking-wide outline-none",
              isDark ? "text-gray-200" : "text-gray-700",
            ].join(" ")}
          />
        ) : (
          <span
            onDoubleClick={startEditing}
            className="cursor-default select-none text-[10px] font-semibold uppercase tracking-wide"
          >
            {title}
          </span>
        )}
      </div>
      <div className="px-3 py-2 text-sm font-medium">
        {data.label as string}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className={isDark ? "bg-gray-400!" : "bg-gray-500!"}
      />
    </div>
  );
}

export const nodeTypes = { custom: CustomNode };
