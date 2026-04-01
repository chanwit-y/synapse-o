import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { DATA_TYPES, type DataType, type Variable } from "./types";

function DataTypeDropdown({
  value,
  onChange,
  isDark,
}: {
  value: DataType;
  onChange: (t: DataType) => void;
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
          "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
          isDark
            ? "bg-gray-600/60 text-gray-300 hover:bg-gray-500/60"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
        ].join(" ")}
      >
        {value}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div
          className={[
            "absolute right-0 top-full z-50 mt-1 min-w-[90px] rounded-md border py-1 shadow-lg",
            isDark ? "border-gray-600 bg-gray-800" : "border-gray-200 bg-white",
          ].join(" ")}
        >
          {DATA_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
              className={[
                "flex w-full items-center px-2.5 py-1 text-[10px] font-medium",
                t === value ? "opacity-100" : "opacity-60",
                isDark
                  ? "text-gray-300 hover:bg-gray-700"
                  : "text-gray-700 hover:bg-gray-100",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VariableRow({
  variable,
  isDark,
  onUpdate,
  onDelete,
}: {
  variable: Variable;
  isDark: boolean;
  onUpdate: (v: Variable) => void;
  onDelete: () => void;
}) {
  const [editingName, setEditingName] = useState(!variable.name);
  const [nameDraft, setNameDraft] = useState(variable.name);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName) nameRef.current?.focus();
  }, [editingName]);

  const commitName = useCallback(() => {
    const trimmed = nameDraft.trim();
    if (trimmed) onUpdate({ ...variable, name: trimmed });
    setEditingName(false);
  }, [nameDraft, variable, onUpdate]);

  return (
    <div
      className={[
        "nodrag nowheel flex items-center gap-1.5 rounded px-2 py-1",
        isDark ? "bg-gray-700/50" : "bg-gray-50",
      ].join(" ")}
    >
      <div className="flex-1 min-w-0">
        {editingName ? (
          <input
            ref={nameRef}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") {
                setNameDraft(variable.name);
                setEditingName(false);
              }
            }}
            placeholder="variable name"
            className={[
              "w-full min-w-0 bg-transparent text-[11px] font-medium outline-none",
              isDark ? "text-gray-200 placeholder:text-gray-500" : "text-gray-700 placeholder:text-gray-400",
            ].join(" ")}
          />
        ) : (
          <span
            onDoubleClick={() => {
              setNameDraft(variable.name);
              setEditingName(true);
            }}
            className={[
              "block cursor-default truncate text-[11px] font-medium",
              isDark ? "text-gray-200" : "text-gray-700",
            ].join(" ")}
          >
            {variable.name || "untitled"}
          </span>
        )}
      </div>
      <DataTypeDropdown
        value={variable.dataType}
        onChange={(dt) => onUpdate({ ...variable, dataType: dt })}
        isDark={isDark}
      />
      <button
        type="button"
        onClick={onDelete}
        className={[
          "shrink-0 rounded p-0.5 transition-colors",
          isDark ? "text-gray-500 hover:text-red-400 hover:bg-gray-600/40" : "text-gray-400 hover:text-red-500 hover:bg-gray-100",
        ].join(" ")}
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}

export function InputBody({
  nodeId,
  variables,
  isDark,
}: {
  nodeId: string;
  variables: Variable[];
  isDark: boolean;
}) {
  const { setNodes } = useReactFlow();

  const addVariable = useCallback(() => {
    const newVar: Variable = {
      id: `var-${Date.now()}`,
      name: "",
      dataType: "string",
    };
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, variables: [...((n.data.variables as Variable[]) || []), newVar] } }
          : n,
      ),
    );
  }, [nodeId, setNodes]);

  const updateVariable = useCallback(
    (updated: Variable) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  variables: ((n.data.variables as Variable[]) || []).map((v) =>
                    v.id === updated.id ? updated : v,
                  ),
                },
              }
            : n,
        ),
      );
    },
    [nodeId, setNodes],
  );

  const deleteVariable = useCallback(
    (varId: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  variables: ((n.data.variables as Variable[]) || []).filter((v) => v.id !== varId),
                },
              }
            : n,
        ),
      );
    },
    [nodeId, setNodes],
  );

  return (
    <div className="flex flex-col gap-1.5">
      {variables.map((v) => (
        <VariableRow
          key={v.id}
          variable={v}
          isDark={isDark}
          onUpdate={updateVariable}
          onDelete={() => deleteVariable(v.id)}
        />
      ))}
      <button
        type="button"
        onClick={addVariable}
        className={[
          "nodrag nowheel flex w-full items-center justify-center gap-1 rounded border border-dashed py-1.5 text-[11px] font-medium transition-colors",
          isDark
            ? "border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300 hover:bg-gray-700/40"
            : "border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 hover:bg-gray-50",
        ].join(" ")}
      >
        <Plus size={12} />
        Add Variable
      </button>
    </div>
  );
}
