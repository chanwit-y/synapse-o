import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow, type Edge, type Node as FlowNode } from "@xyflow/react";
import { ChevronDown } from "lucide-react";
import {
  DEFAULT_API_CONFIG,
  HTTP_METHODS,
  type ApiConfig,
  type HttpMethod,
  type Variable,
} from "./types";

/** Collect variables from nodes connected above (input or variable types). */
export function getUpstreamVariablesForNode(
  nodeId: string,
  getNodes: () => FlowNode[],
  getEdges: () => Edge[],
): Variable[] {
  const edges = getEdges();
  const nodes = getNodes();
  const incoming = edges.filter((e) => e.target === nodeId);
  const vars: Variable[] = [];
  for (const edge of incoming) {
    const src = nodes.find((n) => n.id === edge.source);
    const t = src?.data?.type;
    if ((t === "input" || t === "variable") && Array.isArray(src?.data?.variables)) {
      vars.push(...(src.data.variables as Variable[]));
    }
  }
  return vars;
}

function VariableInsertDropdown({
  nodeId,
  isDark,
  onPick,
}: {
  nodeId: string;
  isDark: boolean;
  onPick: (variableName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<Variable[]>([]);
  const { getNodes, getEdges } = useReactFlow();
  const ref = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    if (!open) {
      setFields(getUpstreamVariablesForNode(nodeId, getNodes, getEdges));
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
    <div ref={ref} className="nodrag nowheel relative shrink-0">
      <button
        type="button"
        onClick={handleToggle}
        className={[
          "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors",
          isDark
            ? "bg-gray-600/60 text-gray-300 hover:bg-gray-500/60"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
        ].join(" ")}
      >
        Var
        <ChevronDown size={9} className="shrink-0" />
      </button>
      {open && (
        <div
          className={[
            "absolute right-0 top-full z-50 mt-1 max-h-[160px] min-w-[140px] overflow-y-auto rounded-md border py-1 shadow-lg",
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
              Connect input or variable above
            </div>
          ) : (
            fields.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onPick(f.name);
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center justify-between gap-2 px-2.5 py-1 text-left text-[10px] font-medium",
                  isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100",
                ].join(" ")}
              >
                <span className="truncate">{f.name || "untitled"}</span>
                <span className={[ "shrink-0 text-[9px]", isDark ? "text-gray-500" : "text-gray-400" ].join(" ")}>
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

function MethodDropdown({
  value,
  onChange,
  isDark,
}: {
  value: HttpMethod;
  onChange: (m: HttpMethod) => void;
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
    <div ref={ref} className="nodrag nowheel relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
          isDark
            ? "bg-gray-600/60 text-gray-200 hover:bg-gray-500/60"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200",
        ].join(" ")}
      >
        {value}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div
          className={[
            "absolute left-0 top-full z-50 mt-1 min-w-[88px] rounded-md border py-1 shadow-lg",
            isDark ? "border-gray-600 bg-gray-800" : "border-gray-200 bg-white",
          ].join(" ")}
        >
          {HTTP_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                onChange(m);
                setOpen(false);
              }}
              className={[
                "flex w-full items-center px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                m === value ? "opacity-100" : "opacity-60",
                isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100",
              ].join(" ")}
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ApiBody({
  nodeId,
  config,
  isDark,
}: {
  nodeId: string;
  config: ApiConfig;
  isDark: boolean;
}) {
  const { setNodes } = useReactFlow();
  const urlRef = useRef<HTMLInputElement>(null);
  const headersRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const patchConfig = useCallback(
    (partial: Partial<ApiConfig>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const prev = (n.data.apiConfig as ApiConfig | undefined) ?? { ...DEFAULT_API_CONFIG };
          return {
            ...n,
            data: { ...n.data, apiConfig: { ...prev, ...partial } },
          };
        }),
      );
    },
    [nodeId, setNodes],
  );

  const insertVariableToken = useCallback(
    (
      field: "url" | "headers" | "body",
      el: HTMLInputElement | HTMLTextAreaElement | null,
      variableName: string,
    ) => {
      const value = config[field];
      const token = `{{${variableName}}}`;
      if (!el) {
        patchConfig({ [field]: value + token });
        return;
      }
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      const next = value.slice(0, start) + token + value.slice(end);
      patchConfig({ [field]: next });
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [config, patchConfig],
  );

  const fieldClass = [
    "nodrag nowheel w-full min-w-0 rounded border px-2 py-1 text-[11px] outline-none",
    isDark
      ? "border-gray-600 bg-gray-900/40 text-gray-200 placeholder:text-gray-500"
      : "border-gray-200 bg-white text-gray-800 placeholder:text-gray-400",
  ].join(" ");

  const labelClass = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div className="flex flex-col gap-2 min-w-[200px]">
      <div className="flex items-center gap-2">
        <span className={["text-[10px] font-medium uppercase tracking-wide shrink-0", labelClass].join(" ")}>
          Method
        </span>
        <MethodDropdown value={config.method} onChange={(m) => patchConfig({ method: m })} isDark={isDark} />
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <label className={["text-[10px] font-medium uppercase tracking-wide", labelClass].join(" ")}>URL</label>
          <VariableInsertDropdown
            nodeId={nodeId}
            isDark={isDark}
            onPick={(name) => insertVariableToken("url", urlRef.current, name)}
          />
        </div>
        <input
          ref={urlRef}
          type="text"
          value={config.url}
          onChange={(e) => patchConfig({ url: e.target.value })}
          placeholder="https://api.example.com/…  ({{var}})"
          className={fieldClass}
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <label className={["text-[10px] font-medium uppercase tracking-wide", labelClass].join(" ")}>
            Headers (JSON)
          </label>
          <VariableInsertDropdown
            nodeId={nodeId}
            isDark={isDark}
            onPick={(name) => insertVariableToken("headers", headersRef.current, name)}
          />
        </div>
        <textarea
          ref={headersRef}
          value={config.headers}
          onChange={(e) => patchConfig({ headers: e.target.value })}
          placeholder='{"Authorization": "Bearer {{token}}"}'
          rows={3}
          className={[fieldClass, "resize-y min-h-[52px] font-mono"].join(" ")}
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <label className={["text-[10px] font-medium uppercase tracking-wide", labelClass].join(" ")}>Body</label>
          <VariableInsertDropdown
            nodeId={nodeId}
            isDark={isDark}
            onPick={(name) => insertVariableToken("body", bodyRef.current, name)}
          />
        </div>
        <textarea
          ref={bodyRef}
          value={config.body}
          onChange={(e) => patchConfig({ body: e.target.value })}
          placeholder='{"userId": "{{id}}"}'
          rows={4}
          className={[fieldClass, "resize-y min-h-[64px] font-mono"].join(" ")}
        />
      </div>
    </div>
  );
}
