import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useTheme } from "../ThemeProvider";

export function CustomNode({ data }: NodeProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={[
        "rounded-xl border px-4 py-3 shadow-sm min-w-[160px]",
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
      <div className="text-xs font-semibold uppercase tracking-wide opacity-50">
        {(data.type as string) ?? "Step"}
      </div>
      <div className="mt-1 text-sm font-medium">{data.label as string}</div>
      <Handle
        type="source"
        position={Position.Bottom}
        className={isDark ? "bg-gray-400!" : "bg-gray-500!"}
      />
    </div>
  );
}

export const nodeTypes = { custom: CustomNode };
