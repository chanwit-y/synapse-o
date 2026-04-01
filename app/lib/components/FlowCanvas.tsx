"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type OnConnect,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "./ThemeProvider";
import type { TreeNode } from "./@types/treeViewTypes";

interface FlowCanvasProps {
  selectedFile: TreeNode;
}

const initialNodes: Node[] = [
  {
    id: "1",
    type: "input",
    data: { label: "Start" },
    position: { x: 250, y: 0 },
  },
];

const initialEdges: Edge[] = [];

export default function FlowCanvas({ selectedFile }: FlowCanvasProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      animated: true,
      style: { stroke: isDark ? "#6b7280" : "#9ca3af" },
    }),
    [isDark],
  );

  return (
    <div className="w-full" style={{ height: "calc(100vh - 120px)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        colorMode={isDark ? "dark" : "light"}
      >
        <Background gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeColor={isDark ? "#374151" : "#e5e7eb"}
          maskColor={isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.1)"}
        />
      </ReactFlow>
    </div>
  );
}
