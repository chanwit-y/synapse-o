"use client";

import { useState, useMemo, useCallback } from "react";
import CodebaseTreeNodeComponent from "./CodebaseTreeNode";
import type {
  CodebaseIndex,
  CodebaseTreeNode,
  CodebaseFileInfo,
  ImportInfo,
} from "./@types/codebaseTreeTypes";
import { useTheme } from "./ThemeProvider";
import {
  File,
  Folder,
  CheckSquare,
  XCircle,
  Code,
  Code2,
  Palette,
  Database,
  Book,
  Globe,
  Image,
  Video,
  Music,
  Terminal,
  Settings,
  GitBranch,
  ArrowRight,
  ArrowLeft,
  Network,
} from "lucide-react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MarkerType,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Helper function to get icon based on file extension
function getFileIcon(fileName: string, className: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    // React/JSX files
    case "tsx":
    case "jsx":
      return <Code2 className={className} />;
    
    // JavaScript/TypeScript
    case "ts":
    case "js":
    case "mjs":
    case "cjs":
      return <Code className={className} />;
    
    // Styles
    case "css":
    case "scss":
    case "sass":
    case "less":
      return <Palette className={className} />;
    
    // JSON/Config
    case "json":
    case "jsonc":
      return <Database className={className} />;
    
    // Documentation
    case "md":
    case "mdx":
    case "txt":
      return <Book className={className} />;
    
    // HTML
    case "html":
    case "htm":
      return <Globe className={className} />;
    
    // Images
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
    case "ico":
      return <Image className={className} />;
    
    // Video
    case "mp4":
    case "mov":
    case "avi":
    case "webm":
      return <Video className={className} />;
    
    // Audio
    case "mp3":
    case "wav":
    case "ogg":
      return <Music className={className} />;
    
    // Shell scripts
    case "sh":
    case "bash":
    case "zsh":
      return <Terminal className={className} />;
    
    // Config files
    case "yaml":
    case "yml":
    case "toml":
    case "ini":
    case "conf":
      return <Settings className={className} />;
    
    // Default
    default:
      return <File className={className} />;
  }
}

interface CodebaseTreeViewProps {
  data: CodebaseIndex;
}

export default function CodebaseTreeView({ data }: CodebaseTreeViewProps) {
  const { theme } = useTheme();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<CodebaseTreeNode | null>(
    null
  );
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showFlowView, setShowFlowView] = useState(false);

  // Create a map of file paths to file info for quick lookup
  const fileInfoMap = useMemo(() => {
    const map = new Map<string, CodebaseFileInfo>();
    data.files.forEach((file) => {
      map.set(file.path, file);
    });
    return map;
  }, [data.files]);

  // Get selected file infos
  const selectedFileInfos = useMemo(() => {
    return Array.from(selectedFiles)
      .map((path) => {
        // Remove leading directory name if present
        const cleanPath = path.startsWith(`${data.directory_tree.name}/`)
          ? path.substring(data.directory_tree.name.length + 1)
          : path;
        return fileInfoMap.get(cleanPath);
      })
      .filter((info): info is CodebaseFileInfo => info !== undefined);
  }, [selectedFiles, fileInfoMap, data.directory_tree.name]);

  const handleNodeClick = (node: CodebaseTreeNode, path: string) => {
    setSelectedPath(path);
    setSelectedNode(node);
    
    // Auto-show flow view when selecting a file with imports
    if (node.type === "file") {
      const cleanPath = path.startsWith(`${data.directory_tree.name}/`)
        ? path.substring(data.directory_tree.name.length + 1)
        : path;
      const fileInfo = fileInfoMap.get(cleanPath);
      
      if (fileInfo && fileInfo.imports && fileInfo.imports.length > 0) {
        setShowFlowView(true);
      } else {
        setShowFlowView(false);
      }
    } else {
      setShowFlowView(false);
    }
  };

  const handleFileCheck = (path: string, checked: boolean) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(path);
      } else {
        newSet.delete(path);
      }
      return newSet;
    });
  };

  const handleClearSelection = () => {
    setSelectedFiles(new Set());
  };

  // Helper function to find a node in the tree by path
  const findNodeByPath = useCallback((path: string): CodebaseTreeNode | null => {
    const parts = path.split('/');
    let currentNode: CodebaseTreeNode = data.directory_tree;
    
    // Skip the first part if it's the root directory name
    const startIndex = parts[0] === data.directory_tree.name ? 1 : 0;
    
    for (let i = startIndex; i < parts.length; i++) {
      if (!currentNode.children) return null;
      const found = currentNode.children.find(child => child.name === parts[i]);
      if (!found) return null;
      currentNode = found;
    }
    
    return currentNode;
  }, [data.directory_tree]);

  // Handle clicking on a selected file to reveal it in the tree
  const handleSelectedFileClick = useCallback((path: string) => {
    const fullPath = path.startsWith(`${data.directory_tree.name}/`) 
      ? path 
      : `${data.directory_tree.name}/${path}`;
    
    const node = findNodeByPath(fullPath);
    if (node) {
      handleNodeClick(node, fullPath);
    }
  }, [data.directory_tree.name, findNodeByPath, handleNodeClick]);

  // Get file info for the currently selected node
  const currentFileInfo = useMemo(() => {
    if (!selectedPath || !selectedNode || selectedNode.type === "directory") {
      return null;
    }
    const cleanPath = selectedPath.startsWith(`${data.directory_tree.name}/`)
      ? selectedPath.substring(data.directory_tree.name.length + 1)
      : selectedPath;
    return fileInfoMap.get(cleanPath);
  }, [selectedPath, selectedNode, fileInfoMap, data.directory_tree.name]);

  // Calculate import dependencies
  const importDependencies = useMemo(() => {
    if (!currentFileInfo || !currentFileInfo.imports) {
      return { directImports: [], reverseDependencies: [] };
    }

    // Get direct imports (what this file imports)
    const directImports = currentFileInfo.imports
      .map((imp) => {
        // Resolve relative imports to actual file paths
        if (imp.source.startsWith(".")) {
          const currentDir = currentFileInfo.path.split("/").slice(0, -1).join("/");
          let resolvedPath = imp.source;
          
          // Handle relative paths
          if (imp.source.startsWith("./")) {
            resolvedPath = currentDir + "/" + imp.source.substring(2);
          } else if (imp.source.startsWith("../")) {
            const parts = currentDir.split("/");
            const upCount = (imp.source.match(/\.\.\//g) || []).length;
            const remainingPath = imp.source.replace(/\.\.\//g, "");
            const newDir = parts.slice(0, -upCount).join("/");
            resolvedPath = newDir + "/" + remainingPath;
          }

          // Try to find the actual file (with various extensions)
          const possiblePaths = [
            resolvedPath,
            `${resolvedPath}.ts`,
            `${resolvedPath}.tsx`,
            `${resolvedPath}.js`,
            `${resolvedPath}.jsx`,
            `${resolvedPath}/index.ts`,
            `${resolvedPath}/index.tsx`,
            `${resolvedPath}/index.js`,
            `${resolvedPath}/index.jsx`,
          ];

          for (const path of possiblePaths) {
            const fileInfo = fileInfoMap.get(path);
            if (fileInfo) {
              return { import: imp, fileInfo };
            }
          }
        }
        return { import: imp, fileInfo: null };
      })
      .filter((item) => item.fileInfo !== null);

    // Get reverse dependencies (files that import this file)
    const reverseDependencies = data.files
      .filter((file) => {
        if (!file.imports) return false;
        return file.imports.some((imp) => {
          if (!imp.source.startsWith(".")) return false;
          
          const fileDir = file.path.split("/").slice(0, -1).join("/");
          let resolvedPath = imp.source;
          
          if (imp.source.startsWith("./")) {
            resolvedPath = fileDir + "/" + imp.source.substring(2);
          } else if (imp.source.startsWith("../")) {
            const parts = fileDir.split("/");
            const upCount = (imp.source.match(/\.\.\//g) || []).length;
            const remainingPath = imp.source.replace(/\.\.\//g, "");
            const newDir = parts.slice(0, -upCount).join("/");
            resolvedPath = newDir + "/" + remainingPath;
          }

          const possiblePaths = [
            resolvedPath,
            `${resolvedPath}.ts`,
            `${resolvedPath}.tsx`,
            `${resolvedPath}.js`,
            `${resolvedPath}.jsx`,
            `${resolvedPath}/index.ts`,
            `${resolvedPath}/index.tsx`,
            `${resolvedPath}/index.js`,
            `${resolvedPath}/index.jsx`,
          ];

          return possiblePaths.some((path) => path === currentFileInfo.path);
        });
      })
      .map((file) => ({
        fileInfo: file,
        import: file.imports!.find((imp) => {
          if (!imp.source.startsWith(".")) return false;
          const fileDir = file.path.split("/").slice(0, -1).join("/");
          let resolvedPath = imp.source;
          
          if (imp.source.startsWith("./")) {
            resolvedPath = fileDir + "/" + imp.source.substring(2);
          } else if (imp.source.startsWith("../")) {
            const parts = fileDir.split("/");
            const upCount = (imp.source.match(/\.\.\//g) || []).length;
            const remainingPath = imp.source.replace(/\.\.\//g, "");
            const newDir = parts.slice(0, -upCount).join("/");
            resolvedPath = newDir + "/" + remainingPath;
          }

          const possiblePaths = [
            resolvedPath,
            `${resolvedPath}.ts`,
            `${resolvedPath}.tsx`,
            `${resolvedPath}.js`,
            `${resolvedPath}.jsx`,
            `${resolvedPath}/index.ts`,
            `${resolvedPath}/index.tsx`,
            `${resolvedPath}/index.js`,
            `${resolvedPath}/index.jsx`,
          ];

          return possiblePaths.some((path) => path === currentFileInfo.path);
        })!,
      }));

    return { directImports, reverseDependencies };
  }, [currentFileInfo, fileInfoMap, data.files]);

  // Generate React Flow nodes and edges
  const { nodes, edges } = useMemo(() => {
    if (!currentFileInfo || !selectedNode || selectedNode.type === "directory") {
      return { nodes: [], edges: [] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    const nodeStyle = {
      light: {
        current: { background: '#3b82f6', color: '#ffffff', border: '2px solid #2563eb' },
        import: { background: '#dbeafe', color: '#1e40af', border: '2px solid #3b82f6' },
        reverse: { background: '#d1fae5', color: '#065f46', border: '2px solid #10b981' },
        external: { background: '#f3e8ff', color: '#6b21a8', border: '2px solid #9333ea' },
      },
      dark: {
        current: { background: '#2563eb', color: '#ffffff', border: '2px solid #3b82f6' },
        import: { background: '#1e3a8a', color: '#93c5fd', border: '2px solid #3b82f6' },
        reverse: { background: '#064e3b', color: '#6ee7b7', border: '2px solid #10b981' },
        external: { background: '#581c87', color: '#e9d5ff', border: '2px solid #9333ea' },
      },
    };

    const currentStyle = theme === 'light' ? nodeStyle.light : nodeStyle.dark;

    // Center node - current file
    nodes.push({
      id: 'current',
      type: 'default',
      data: { 
        label: (
          <div style={{ textAlign: 'center', padding: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{selectedNode.name}</div>
            <div style={{ fontSize: '10px', opacity: 0.8 }}>{currentFileInfo.path}</div>
          </div>
        )
      },
      position: { x: 400, y: 300 },
      style: {
        ...currentStyle.current,
        padding: '10px',
        borderRadius: '8px',
        minWidth: '200px',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    // Direct imports (what this file imports) - positioned to the right
    importDependencies.directImports.forEach((dep, idx) => {
      const nodeId = `import-${idx}`;
      const fileName = dep.fileInfo!.path.split('/').pop() || dep.fileInfo!.path;
      
      nodes.push({
        id: nodeId,
        type: 'default',
        data: { 
          label: (
            <div style={{ textAlign: 'center', padding: '6px' }}>
              <div style={{ fontWeight: '600', fontSize: '12px' }}>{fileName}</div>
              {dep.import.named && dep.import.named.length > 0 && (
                <div style={{ fontSize: '9px', opacity: 0.7, marginTop: '2px' }}>
                  {dep.import.named.map(n => n.name).slice(0, 3).join(', ')}
                  {dep.import.named.length > 3 ? '...' : ''}
                </div>
              )}
            </div>
          )
        },
        position: { x: 750, y: 200 + idx * 120 },
        style: {
          ...currentStyle.import,
          padding: '8px',
          borderRadius: '6px',
          minWidth: '150px',
          fontSize: '11px',
        },
        targetPosition: Position.Left,
      });

      edges.push({
        id: `e-current-${nodeId}`,
        source: 'current',
        target: nodeId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: theme === 'light' ? '#3b82f6' : '#60a5fa', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: theme === 'light' ? '#3b82f6' : '#60a5fa',
        },
        label: 'imports',
        labelStyle: { fill: theme === 'light' ? '#3b82f6' : '#60a5fa', fontSize: 10 },
        labelBgStyle: { fill: theme === 'light' ? '#ffffff' : '#1f2937' },
      });
    });

    // Reverse dependencies (files that import this) - positioned to the left
    importDependencies.reverseDependencies.forEach((dep, idx) => {
      const nodeId = `reverse-${idx}`;
      const fileName = dep.fileInfo.path.split('/').pop() || dep.fileInfo.path;
      
      nodes.push({
        id: nodeId,
        type: 'default',
        data: { 
          label: (
            <div style={{ textAlign: 'center', padding: '6px' }}>
              <div style={{ fontWeight: '600', fontSize: '12px' }}>{fileName}</div>
              {dep.import.named && dep.import.named.length > 0 && (
                <div style={{ fontSize: '9px', opacity: 0.7, marginTop: '2px' }}>
                  imports: {dep.import.named.map(n => n.name).slice(0, 2).join(', ')}
                  {dep.import.named.length > 2 ? '...' : ''}
                </div>
              )}
            </div>
          )
        },
        position: { x: 50, y: 200 + idx * 120 },
        style: {
          ...currentStyle.reverse,
          padding: '8px',
          borderRadius: '6px',
          minWidth: '150px',
          fontSize: '11px',
        },
        sourcePosition: Position.Right,
      });

      edges.push({
        id: `e-${nodeId}-current`,
        source: nodeId,
        target: 'current',
        type: 'smoothstep',
        animated: true,
        style: { stroke: theme === 'light' ? '#10b981' : '#34d399', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: theme === 'light' ? '#10b981' : '#34d399',
        },
        label: 'imports',
        labelStyle: { fill: theme === 'light' ? '#10b981' : '#34d399', fontSize: 10 },
        labelBgStyle: { fill: theme === 'light' ? '#ffffff' : '#1f2937' },
      });
    });

    // External packages - positioned at the bottom
    const externalPackages = currentFileInfo.imports?.filter(
      (imp) => !imp.source.startsWith(".")
    ) || [];

    externalPackages.forEach((pkg, idx) => {
      const nodeId = `external-${idx}`;
      
      nodes.push({
        id: nodeId,
        type: 'default',
        data: { 
          label: (
            <div style={{ textAlign: 'center', padding: '6px' }}>
              <div style={{ fontWeight: '600', fontSize: '11px', fontFamily: 'monospace' }}>
                📦 {pkg.source}
              </div>
              {(pkg.named || pkg.default) && (
                <div style={{ fontSize: '9px', opacity: 0.7, marginTop: '2px' }}>
                  {pkg.default ? `default` : ''}
                  {pkg.named && pkg.named.length > 0 ? 
                    `${pkg.default ? ', ' : ''}${pkg.named.slice(0, 2).map(n => n.name).join(', ')}` : ''}
                  {pkg.named && pkg.named.length > 2 ? '...' : ''}
                </div>
              )}
            </div>
          )
        },
        position: { x: 200 + idx * 200, y: 550 },
        style: {
          ...currentStyle.external,
          padding: '8px',
          borderRadius: '6px',
          minWidth: '160px',
          fontSize: '10px',
        },
        targetPosition: Position.Top,
      });

      edges.push({
        id: `e-current-${nodeId}`,
        source: 'current',
        target: nodeId,
        type: 'smoothstep',
        animated: false,
        style: { stroke: theme === 'light' ? '#9333ea' : '#c084fc', strokeWidth: 2, strokeDasharray: '5,5' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: theme === 'light' ? '#9333ea' : '#c084fc',
        },
        label: 'uses',
        labelStyle: { fill: theme === 'light' ? '#9333ea' : '#c084fc', fontSize: 10 },
        labelBgStyle: { fill: theme === 'light' ? '#ffffff' : '#1f2937' },
      });
    });

    return { nodes, edges };
  }, [currentFileInfo, selectedNode, importDependencies, theme]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="flex h-full gap-4">
      {/* Tree View Panel */}
      <div
        className={`w-[350px] overflow-y-auto rounded-lg border ${
          theme === "light"
            ? "bg-white border-gray-200"
            : "bg-gray-900 border-gray-700"
        }`}
        style={{ minHeight: '600px', maxHeight: 'calc(100vh - 120px)' }}
      >
        <div
          className={`sticky top-0 z-10 px-4 py-3 border-b ${
            theme === "light"
              ? "bg-gray-50 border-gray-200"
              : "bg-gray-800 border-gray-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {data.project.name}
            </h2>
            {selectedFiles.size > 0 && (
              <button
                onClick={handleClearSelection}
                className={`flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors ${
                  theme === "light"
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-red-900/30 text-red-300 hover:bg-red-900/50"
                }`}
              >
                <XCircle className="w-4 h-4" />
                Clear ({selectedFiles.size})
              </button>
            )}
          </div>
          <p
            className={`text-sm mt-1 ${
              theme === "light" ? "text-gray-600" : "text-gray-400"
            }`}
          >
            {data.summary.total_files} files • {data.summary.total_lines} lines
          </p>
        </div>
        <div className="p-2">
          <CodebaseTreeNodeComponent
            node={data.directory_tree}
            level={0}
            nodePath={data.directory_tree.name}
            selectedPath={selectedPath}
            selectedFiles={selectedFiles}
            onNodeClick={handleNodeClick}
            onFileCheck={handleFileCheck}
          />
        </div>
      </div>

      {/* Details Panel */}
      <div
        className={`w-96 overflow-y-auto rounded-lg border ${
          theme === "light"
            ? "bg-white border-gray-200"
            : "bg-gray-900 border-gray-700"
        }`}
        style={{ minHeight: '600px', maxHeight: 'calc(100vh - 120px)' }}
      >
        <div
          className={`sticky top-0 z-10 px-4 py-3 border-b ${
            theme === "light"
              ? "bg-gray-50 border-gray-200"
              : "bg-gray-800 border-gray-700"
          }`}
        >
          <h3 className="text-lg font-semibold">Details</h3>
        </div>

        <div className="p-4 space-y-6">
          {/* Current Selected File/Folder Info */}
          {selectedNode ? (
            <>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  {selectedNode.type === "directory" ? (
                    <Folder
                      className={`w-5 h-5 ${
                        theme === "light" ? "text-blue-500" : "text-blue-400"
                      }`}
                    />
                  ) : (
                    getFileIcon(
                      selectedNode.name,
                      `w-5 h-5 ${
                        theme === "light" ? "text-gray-500" : "text-gray-400"
                      }`
                    )
                  )}
                  <h4 className="font-medium text-sm truncate">
                    {selectedNode.name}
                  </h4>
                </div>

                {currentFileInfo && (
                  <div className="space-y-2 text-sm">
                    {currentFileInfo.description && (
                      <div>
                        <span
                          className={`font-medium ${
                            theme === "light" ? "text-gray-700" : "text-gray-300"
                          }`}
                        >
                          Description:
                        </span>
                        <p
                          className={`mt-1 ${
                            theme === "light" ? "text-gray-600" : "text-gray-400"
                          }`}
                        >
                          {currentFileInfo.description}
                        </p>
                      </div>
                    )}
                    
                    <div className={theme === "light" ? "text-gray-600" : "text-gray-400"}>
                      <span className={`font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>Path:</span> {currentFileInfo.path}
                    </div>

                    <div className={theme === "light" ? "text-gray-600" : "text-gray-400"}>
                      <span className={`font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>Size:</span> {formatBytes(currentFileInfo.metadata.size_bytes)}
                    </div>

                    <div className={theme === "light" ? "text-gray-600" : "text-gray-400"}>
                      <span className={`font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>Last Modified:</span> {formatDate(currentFileInfo.metadata.last_modified)}
                    </div>

                    {currentFileInfo.line_counts && (
                      <>
                        <div className={theme === "light" ? "text-gray-600" : "text-gray-400"}>
                          <span className={`font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>Lines:</span>
                        </div>
                        <div className={`ml-4 space-y-1 text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
                          <div><span className="font-medium">Total:</span> {currentFileInfo.line_counts.total}</div>
                          <div><span className="font-medium">Code:</span> {currentFileInfo.line_counts.code}</div>
                          <div><span className="font-medium">Comment:</span> {currentFileInfo.line_counts.comment}</div>
                          <div><span className="font-medium">Blank:</span> {currentFileInfo.line_counts.blank}</div>
                        </div>
                      </>
                    )}

                    <div className={`break-all ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
                      <span className={`font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>MD5:</span> <span className="text-xs font-mono">{currentFileInfo.metadata.md5}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Dependencies Section - only for files */}
              {currentFileInfo && selectedNode.type === "file" && (
                <>
                  {/* This file imports (Direct Dependencies) */}
                  <div className="pt-6 border-t">
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowRight
                        className={`w-4 h-4 ${
                          theme === "light" ? "text-blue-500" : "text-blue-400"
                        }`}
                      />
                      <h5 className="font-medium text-sm">
                        Imports ({importDependencies.directImports.length})
                      </h5>
                    </div>
                    {importDependencies.directImports.length > 0 ? (
                      <div className="space-y-2">
                        {importDependencies.directImports.map((dep, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded border text-xs ${
                              theme === "light"
                                ? "bg-blue-50 border-blue-200"
                                : "bg-blue-900/20 border-blue-800"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {getFileIcon(
                                dep.fileInfo!.path,
                                `w-4 h-4 shrink-0 mt-0.5 ${
                                  theme === "light"
                                    ? "text-blue-600"
                                    : "text-blue-400"
                                }`
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium break-all">
                                  {dep.fileInfo!.path}
                                </p>
                                {dep.import.named && dep.import.named.length > 0 && (
                                  <p
                                    className={`mt-1 ${
                                      theme === "light"
                                        ? "text-gray-600"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    Named:{" "}
                                    {dep.import.named.map((n) => n.name).join(", ")}
                                  </p>
                                )}
                                {dep.import.default && (
                                  <p
                                    className={`mt-1 ${
                                      theme === "light"
                                        ? "text-gray-600"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    Default: {dep.import.default}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p
                        className={`text-xs ${
                          theme === "light" ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        No local file imports found
                      </p>
                    )}
                  </div>

                  {/* Imported by (Reverse Dependencies) */}
                  <div className="pt-6 border-t">
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowLeft
                        className={`w-4 h-4 ${
                          theme === "light" ? "text-green-500" : "text-green-400"
                        }`}
                      />
                      <h5 className="font-medium text-sm">
                        Imported By ({importDependencies.reverseDependencies.length})
                      </h5>
                    </div>
                    {importDependencies.reverseDependencies.length > 0 ? (
                      <div className="space-y-2">
                        {importDependencies.reverseDependencies.map((dep, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded border text-xs ${
                              theme === "light"
                                ? "bg-green-50 border-green-200"
                                : "bg-green-900/20 border-green-800"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {getFileIcon(
                                dep.fileInfo.path,
                                `w-4 h-4 shrink-0 mt-0.5 ${
                                  theme === "light"
                                    ? "text-green-600"
                                    : "text-green-400"
                                }`
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium break-all">
                                  {dep.fileInfo.path}
                                </p>
                                {dep.import.named && dep.import.named.length > 0 && (
                                  <p
                                    className={`mt-1 ${
                                      theme === "light"
                                        ? "text-gray-600"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    Imports:{" "}
                                    {dep.import.named.map((n) => n.name).join(", ")}
                                  </p>
                                )}
                                {dep.import.default && (
                                  <p
                                    className={`mt-1 ${
                                      theme === "light"
                                        ? "text-gray-600"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    Imports: {dep.import.default}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p
                        className={`text-xs ${
                          theme === "light" ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        No files import this file
                      </p>
                    )}
                  </div>

                  {/* External Dependencies */}
                  {currentFileInfo.imports && currentFileInfo.imports.length > 0 && (
                    <div className="pt-6 border-t">
                      <div className="flex items-center gap-2 mb-3">
                        <Database
                          className={`w-4 h-4 ${
                            theme === "light" ? "text-purple-500" : "text-purple-400"
                          }`}
                        />
                        <h5 className="font-medium text-sm">External Packages</h5>
                      </div>
                      <div className="space-y-1.5">
                        {currentFileInfo.imports
                          .filter((imp) => !imp.source.startsWith("."))
                          .map((imp, idx) => (
                            <div
                              key={idx}
                              className={`p-2 rounded text-xs ${
                                theme === "light"
                                  ? "bg-purple-50 text-purple-700"
                                  : "bg-purple-900/20 text-purple-300"
                              }`}
                            >
                              <p className="font-mono font-medium">{imp.source}</p>
                              {(imp.named || imp.default || imp.namespace) && (
                                <p
                                  className={`mt-1 text-xs ${
                                    theme === "light"
                                      ? "text-purple-600"
                                      : "text-purple-400"
                                  }`}
                                >
                                  {imp.default && `default: ${imp.default}`}
                                  {imp.named &&
                                    imp.named.length > 0 &&
                                    `${imp.default ? ", " : ""}named: ${imp.named
                                      .map((n) => n.name)
                                      .join(", ")}`}
                                  {imp.namespace && `* as ${imp.namespace}`}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <p
              className={`text-sm ${
                theme === "light" ? "text-gray-500" : "text-gray-400"
              }`}
            >
              Select a file or folder to view details
            </p>
          )}

          {/* Selected Files Section */}
          {selectedFileInfos.length > 0 && (
            <div className="pt-6 border-t">
              <div className="flex items-center gap-2 mb-3">
                <CheckSquare
                  className={`w-5 h-5 ${
                    theme === "light" ? "text-green-500" : "text-green-400"
                  }`}
                />
                <h4 className="font-medium text-sm">
                  Selected Files ({selectedFileInfos.length})
                </h4>
              </div>

              <div className="space-y-2">
                {selectedFileInfos.map((fileInfo) => (
                  <div
                    key={fileInfo.path}
                    onClick={() => handleSelectedFileClick(fileInfo.path)}
                    className={`p-2 rounded text-xs cursor-pointer transition-all ${
                      theme === "light"
                        ? "bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                        : "bg-gray-800 border border-gray-700 hover:bg-gray-750 hover:border-gray-600"
                    }`}
                  >
                    <p className="font-medium truncate">{fileInfo.path}</p>
                    <div
                      className={`mt-1 flex gap-2 ${
                        theme === "light" ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      <span>{formatBytes(fileInfo.metadata.size_bytes)}</span>
                      {fileInfo.line_counts && (
                        <span>• {fileInfo.line_counts.total} lines</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className={`mt-3 p-2 rounded text-xs ${
                  theme === "light"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-blue-900/30 text-blue-300"
                }`}
              >
                <p className="font-medium">Total:</p>
                <p className="mt-1">
                  {formatBytes(
                    selectedFileInfos.reduce(
                      (sum, f) => sum + f.metadata.size_bytes,
                      0
                    )
                  )}{" "}
                  •{" "}
                  {selectedFileInfos.reduce(
                    (sum, f) => sum + (f.line_counts?.total || 0),
                    0
                  )}{" "}
                  lines
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flow View Panel (conditional) */}
      {currentFileInfo && 
       selectedNode?.type === "file" && 
       (currentFileInfo.imports && currentFileInfo.imports.length > 0) && (
        <div
          className={`${
            showFlowView ? 'w-[600px]' : 'w-0'
          } transition-all duration-300 overflow-hidden rounded-lg border ${
            theme === "light"
              ? "bg-white border-gray-200"
              : "bg-gray-900 border-gray-700"
          }`}
          style={{ minHeight: '600px', maxHeight: 'calc(100vh - 120px)' }}
        >
          <div
            className={`h-full flex flex-col ${
              theme === "light" ? "bg-white" : "bg-gray-900"
            }`}
          >
            {/* Flow View Header */}
            <div
              className={`flex items-center gap-2 px-4 py-3 border-b ${
                theme === "light"
                  ? "bg-gray-50 border-gray-200"
                  : "bg-gray-800 border-gray-700"
              }`}
            >
              <Network
                className={`w-5 h-5 ${
                  theme === "light" ? "text-blue-500" : "text-blue-400"
                }`}
              />
              <h3 className="text-lg font-semibold">Dependency Flow</h3>
            </div>

            {/* Flow Canvas */}
            <div className="flex-1 relative">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                className={theme === "dark" ? "dark" : ""}
                minZoom={0.2}
                maxZoom={2}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
              >
                <Background
                  color={theme === "light" ? "#e5e7eb" : "#374151"}
                  gap={16}
                />
                <Controls
                  className={
                    theme === "light"
                      ? ""
                      : "[&_button]:bg-gray-800 [&_button]:border-gray-600 [&_button]:text-gray-200"
                  }
                />
              </ReactFlow>
            </div>

            {/* Legend */}
            <div
              className={`px-4 py-3 border-t ${
                theme === "light"
                  ? "bg-gray-50 border-gray-200"
                  : "bg-gray-800 border-gray-700"
              }`}
            >
              <div className="flex items-center justify-around text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded ${
                      theme === "light" ? "bg-blue-400" : "bg-blue-600"
                    }`}
                  />
                  <span>Current File</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded ${
                      theme === "light" ? "bg-blue-100" : "bg-blue-900"
                    }`}
                  />
                  <span>Imports From</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded ${
                      theme === "light" ? "bg-green-100" : "bg-green-900"
                    }`}
                  />
                  <span>Imported By</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded ${
                      theme === "light" ? "bg-purple-100" : "bg-purple-900"
                    }`}
                  />
                  <span>External Packages</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
