import { useMemo } from "react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";

import type { ImportEntry } from "./types";

interface ImportDependencyGraphProps {
  imports: ImportEntry[];
  fileName: string;
  theme: string;
}

export function ImportDependencyGraph({
  imports,
  fileName,
  theme,
}: ImportDependencyGraphProps) {
  const isLight = theme === "light";

  const verticalGap = 60;
  const sourceX = 50;
  const colWidth = 330;

  const { allNodes, allEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const parentIdForImp = (impIndex: number) => `imp-${impIndex}`;

    type LayoutSlot = { id: string; imp: ImportEntry; children: LayoutSlot[] };
    const rootSlots: LayoutSlot[] = imports.map((imp, i) => {
      const children: LayoutSlot[] = (imp.imports ?? []).map((sub, j) => {
        const subChildren: LayoutSlot[] = (sub.imports ?? []).map((sub2, k) => ({
          id: `sub2-${i}-${j}-${k}`,
          imp: sub2,
          children: [],
        }));
        return { id: `sub-${i}-${j}`, imp: sub, children: subChildren };
      });
      return { id: parentIdForImp(i), imp, children };
    });

    function leafCount(slot: LayoutSlot): number {
      if (slot.children.length === 0) return 1;
      return slot.children.reduce((sum, child) => sum + leafCount(child), 0);
    }

    function assignY(slots: LayoutSlot[], startY: number): Map<string, number> {
      const yMap = new Map<string, number>();
      let cursor = startY;
      for (const slot of slots) {
        const childYMap = assignY(slot.children, cursor);
        childYMap.forEach((value, key) => yMap.set(key, value));

        if (slot.children.length > 0) {
          const childYs = slot.children.map((child) => childYMap.get(child.id) ?? cursor);
          const slotY = (Math.min(...childYs) + Math.max(...childYs)) / 2;
          yMap.set(slot.id, slotY);
          cursor += leafCount(slot) * verticalGap;
        } else {
          yMap.set(slot.id, cursor);
          cursor += verticalGap;
        }
      }
      return yMap;
    }

    const yMap = assignY(rootSlots, 0);

    const impYs = rootSlots.map((slot) => yMap.get(slot.id) ?? 0);
    const sourceY =
      impYs.length > 0 ? (Math.min(...impYs) + Math.max(...impYs)) / 2 : 0;

    nodes.push({
      id: "__source__",
      position: { x: sourceX, y: sourceY },
      data: { label: fileName },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        background: "#3b82f6",
        color: "white",
        border: "2px solid #1d4ed8",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: "600",
        padding: "8px 14px",
        width: 210,
        textAlign: "center" as const,
      },
    });

    const makeStyle = (imp: ImportEntry, depth: number) => {
      const ext = imp.is_external;
      const width = depth === 0 ? 230 : depth === 1 ? 210 : 190;
      const fontSize = depth === 0 ? "11px" : "10px";
      return {
        background: ext
          ? isLight
            ? "#faf5ff"
            : "#2e1065"
          : isLight
            ? "#f0fdf4"
            : "#052e16",
        color: ext
          ? isLight
            ? "#6b21a8"
            : "#e9d5ff"
          : isLight
            ? "#166534"
            : "#bbf7d0",
        border: `1.5px solid ${
          ext ? (isLight ? "#a855f7" : "#7c3aed") : isLight ? "#22c55e" : "#16a34a"
        }`,
        borderRadius: "6px",
        fontSize,
        fontFamily: "ui-monospace, monospace",
        padding: "6px 10px",
        width,
        opacity: depth === 2 ? 0.85 : 1,
      };
    };

    const edgeStyle = (imp: ImportEntry, dashed: boolean) => {
      const ext = imp.is_external;
      return {
        style: {
          stroke: ext ? (isLight ? "#a855f7" : "#7c3aed") : isLight ? "#22c55e" : "#16a34a",
          strokeWidth: dashed ? 1 : 1.5,
          ...(dashed ? { strokeDasharray: "4 2" } : {}),
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: dashed ? 12 : 16,
          height: dashed ? 12 : 16,
          color: ext ? (isLight ? "#a855f7" : "#7c3aed") : isLight ? "#22c55e" : "#16a34a",
        },
      };
    };

    function addSlotNodes(slots: LayoutSlot[], depth: number, parentId: string) {
      const colX = sourceX + (depth + 1) * colWidth;
      for (const slot of slots) {
        const y = yMap.get(slot.id) ?? 0;
        nodes.push({
          id: slot.id,
          position: { x: colX, y },
          data: { label: slot.imp.from },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          style: makeStyle(slot.imp, depth),
        });
        edges.push({
          id: `e-${parentId}-${slot.id}`,
          source: parentId,
          target: slot.id,
          ...edgeStyle(slot.imp, depth > 0),
        });
        if (slot.children.length > 0) {
          addSlotNodes(slot.children, depth + 1, slot.id);
        }
      }
    }

    addSlotNodes(rootSlots, 0, "__source__");
    return { allNodes: nodes, allEdges: edges };
  }, [imports, fileName, isLight, sourceX, colWidth, verticalGap]);

  const [rfNodes, , onNodesChange] = useNodesState(allNodes);
  const [rfEdges, , onEdgesChange] = useEdgesState(allEdges);

  if (imports.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className={["text-sm", isLight ? "text-gray-400" : "text-gray-500"].join(" ")}>
          No imports to display.
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        colorMode={isLight ? "light" : "dark"}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.id === "__source__") return "#3b82f6";
            const border = String(node.style?.border ?? "");
            return border.includes("a855f7") || border.includes("7c3aed")
              ? "#a855f7"
              : "#22c55e";
          }}
        />
      </ReactFlow>
    </div>
  );
}
