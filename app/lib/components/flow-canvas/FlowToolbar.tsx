import { Panel } from "@xyflow/react";
import { Maximize, Minimize, Plus, Save } from "lucide-react";
import type { Node, Edge } from "@xyflow/react";

interface FlowToolbarProps {
  isDark: boolean;
  nodes: Node[];
  edges: Edge[];
  onAddNode: () => void;
  onSave: () => void;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
}

function ToolbarButton({
  onClick,
  isDark,
  title,
  children,
}: {
  onClick: () => void;
  isDark: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center justify-center rounded-lg p-2 shadow-md transition-colors",
        isDark
          ? "bg-gray-700 text-gray-100 hover:bg-gray-600"
          : "bg-white text-gray-700 hover:bg-gray-100",
      ].join(" ")}
      title={title}
    >
      {children}
    </button>
  );
}

export function FlowToolbar({
  isDark,
  onAddNode,
  onSave,
  isFullScreen,
  onToggleFullScreen,
}: FlowToolbarProps) {
  return (
    <Panel position="top-right" className="flex gap-2">
      <ToolbarButton onClick={onAddNode} isDark={isDark} title="Add node">
        <Plus size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={onSave} isDark={isDark} title="Save">
        <Save size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={onToggleFullScreen}
        isDark={isDark}
        title={isFullScreen ? "Exit full screen" : "Full screen"}
      >
        {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
      </ToolbarButton>
    </Panel>
  );
}
