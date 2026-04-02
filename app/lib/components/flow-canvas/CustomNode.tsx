import { Handle, Position, NodeResizer, useReactFlow, type NodeProps } from "@xyflow/react";
import { useCallback, useRef, useState } from "react";
import { useTheme } from "../ThemeProvider";
import {
  NODE_TYPES,
  DEFAULT_ROOT_GROUP,
  DEFAULT_API_CONFIG,
  type NodeType,
  type Variable,
  type ConditionGroup,
  type ApiConfig,
} from "./types";
import { TypeDropdown } from "./TypeDropdown";
import { InputBody } from "./InputBody";
import { ConditionBody } from "./ConditionBody";
import { ApiBody } from "./ApiBody";

export function CustomNode({ id, data, selected }: NodeProps) {
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
        nds.map((n) => {
          if (n.id !== id) return n;
          const existingApi = (n.data as { apiConfig?: ApiConfig }).apiConfig;
          return {
            ...n,
            data: {
              ...n.data,
              type: newType,
              ...(newType === "api" && existingApi == null
                ? { apiConfig: { ...DEFAULT_API_CONFIG } }
                : {}),
            },
          };
        }),
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
        "rounded-md border shadow-sm h-full min-h-[80px] overflow-visible",
        currentType === "api" ? "min-w-[240px]" : "min-w-[180px]",
        isDark
          ? "border-gray-600 bg-gray-800 text-gray-100"
          : "border-gray-200 bg-white text-gray-800",
      ].join(" ")}
    >
      <NodeResizer
        isVisible={!!selected}
        minWidth={currentType === "api" ? 240 : 180}
        minHeight={currentType === "api" ? 280 : 80}
        lineClassName={isDark ? "!border-blue-400" : "!border-blue-500"}
        handleClassName={[
          "!w-2.5 !h-2.5 !rounded-sm !border-2",
          isDark ? "!border-blue-400 !bg-gray-800" : "!border-blue-500 !bg-white",
        ].join(" ")}
      />
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
      <div className="px-2 py-2">
        {currentType === "input" || currentType === "variable" ? (
          <InputBody
            nodeId={id}
            variables={(data.variables as Variable[]) || []}
            isDark={isDark}
          />
        ) : currentType === "condition" ? (
          <ConditionBody
            nodeId={id}
            conditions={
              (data.conditions as ConditionGroup) || { ...DEFAULT_ROOT_GROUP }
            }
            isDark={isDark}
          />
        ) : currentType === "api" ? (
          <ApiBody
            nodeId={id}
            config={
              (data.apiConfig as ApiConfig | undefined)
                ? { ...DEFAULT_API_CONFIG, ...(data.apiConfig as ApiConfig) }
                : { ...DEFAULT_API_CONFIG }
            }
            isDark={isDark}
          />
        ) : (
          <div className="text-sm font-medium px-1">{data.label as string}</div>
        )}
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
