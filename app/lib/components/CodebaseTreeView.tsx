"use client";

import { useState, useMemo } from "react";
import CodebaseTreeNodeComponent from "./CodebaseTreeNode";
import type {
  CodebaseIndex,
  CodebaseTreeNode,
  CodebaseFileInfo,
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
} from "lucide-react";

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
        className={`flex-1 overflow-y-auto rounded-lg border ${
          theme === "light"
            ? "bg-white border-gray-200"
            : "bg-gray-900 border-gray-700"
        }`}
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

        <div className="p-4 space-y-4">
          {/* Current Selected File/Folder Info */}
          {selectedNode ? (
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
                  
                  <div>
                    <span
                      className={`font-medium ${
                        theme === "light" ? "text-gray-700" : "text-gray-300"
                      }`}
                    >
                      Path:
                    </span>
                    <p
                      className={`mt-1 break-all ${
                        theme === "light" ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      {currentFileInfo.path}
                    </p>
                  </div>

                  <div>
                    <span
                      className={`font-medium ${
                        theme === "light" ? "text-gray-700" : "text-gray-300"
                      }`}
                    >
                      Size:
                    </span>
                    <p
                      className={`mt-1 ${
                        theme === "light" ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      {formatBytes(currentFileInfo.metadata.size_bytes)}
                    </p>
                  </div>

                  <div>
                    <span
                      className={`font-medium ${
                        theme === "light" ? "text-gray-700" : "text-gray-300"
                      }`}
                    >
                      Last Modified:
                    </span>
                    <p
                      className={`mt-1 ${
                        theme === "light" ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      {formatDate(currentFileInfo.metadata.last_modified)}
                    </p>
                  </div>

                  {currentFileInfo.line_counts && (
                    <div>
                      <span
                        className={`font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        }`}
                      >
                        Lines:
                      </span>
                      <div
                        className={`mt-1 space-y-1 ${
                          theme === "light" ? "text-gray-600" : "text-gray-400"
                        }`}
                      >
                        <p>Total: {currentFileInfo.line_counts.total}</p>
                        <p>Code: {currentFileInfo.line_counts.code}</p>
                        <p>Comment: {currentFileInfo.line_counts.comment}</p>
                        <p>Blank: {currentFileInfo.line_counts.blank}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <span
                      className={`font-medium ${
                        theme === "light" ? "text-gray-700" : "text-gray-300"
                      }`}
                    >
                      MD5:
                    </span>
                    <p
                      className={`mt-1 text-xs break-all font-mono ${
                        theme === "light" ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      {currentFileInfo.metadata.md5}
                    </p>
                  </div>
                </div>
              )}
            </div>
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
            <div className="pt-4 border-t">
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
                    className={`p-2 rounded text-xs ${
                      theme === "light"
                        ? "bg-gray-50 border border-gray-200"
                        : "bg-gray-800 border border-gray-700"
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
    </div>
  );
}
