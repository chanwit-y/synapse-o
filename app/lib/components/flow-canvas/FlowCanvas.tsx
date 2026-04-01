"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  type OnConnect,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "../ThemeProvider";
import type { TreeNode } from "../@types/treeViewTypes";
import { nodeTypes } from "./CustomNode";
import { FlowToolbar } from "./FlowToolbar";

export interface FlowCanvasProps {
  selectedFile: TreeNode;
}

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

function FlowCanvasInner({ selectedFile }: FlowCanvasProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const nodeIdCounter = useRef(2);
  const { screenToFlowPosition } = useReactFlow();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const addNode = useCallback(() => {
    const id = String(nodeIdCounter.current++);
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const newNode: Node = {
      id,
      type: "custom",
      data: { label: `Node ${id}`, type: "Step" },
      position,
    };
    setNodes((nds) => [...nds, newNode]);
  }, [screenToFlowPosition, setNodes]);

  const handleSave = useCallback(() => {
    const data = JSON.stringify({ nodes, edges }, null, 2);
    console.log("Flow saved:", data);
  }, [nodes, edges]);

  const defaultEdgeOptions = useMemo(
    () => ({
      animated: true,
      style: { stroke: isDark ? "#6b7280" : "#9ca3af" },
    }),
    [isDark],
  );

  return (
    <div ref={containerRef} className="w-full" style={{ height: "calc(100vh - 120px)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        defaultEdgeOptions={defaultEdgeOptions}
        nodeTypes={nodeTypes}
        fitView
        colorMode={isDark ? "dark" : "light"}
      >
        <Background gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeColor={isDark ? "#374151" : "#e5e7eb"}
          maskColor={isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.1)"}
        />
        <FlowToolbar
          isDark={isDark}
          nodes={nodes}
          edges={edges}
          onAddNode={addNode}
          onSave={handleSave}
          isFullScreen={isFullScreen}
          onToggleFullScreen={toggleFullScreen}
        />
      </ReactFlow>
    </div>
  );
}

export default function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
