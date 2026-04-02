import { useCallback, useEffect, useRef, useState } from "react";
import { NODE_TYPES, type NodeType } from "./types";

export const typeIcons: Record<NodeType, React.ReactNode> = {
  input: (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5 shrink-0">
      <path d="M2 8h10M9 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  variable: (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5 shrink-0">
      <path d="M4 3C5.5 3 6.5 4.5 7 6s1 4 3 4M12 3C10.5 3 9.5 4.5 9 6s-1 4-3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="3" cy="8" r="1" fill="currentColor" />
      <circle cx="13" cy="8" r="1" fill="currentColor" />
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
  api: (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5 shrink-0">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 8h12M8 2c-2 2.2-2 9.8 0 12M8 2c2 2.2 2 9.8 0 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  expression: (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5 shrink-0">
      <path
        d="M4 12V4M4 8h6a2 2 0 0 1 0 4H4M10 4v8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export function TypeDropdown({
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
