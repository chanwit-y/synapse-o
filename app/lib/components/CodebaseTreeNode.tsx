"use client";

import { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
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
import type { CodebaseTreeNode } from "./@types/codebaseTreeTypes";
import { useTheme } from "./ThemeProvider";

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

interface CodebaseTreeNodeProps {
  node: CodebaseTreeNode;
  level: number;
  nodePath: string;
  selectedPath: string | null;
  selectedFiles: Set<string>;
  onNodeClick: (node: CodebaseTreeNode, path: string) => void;
  onFileCheck: (path: string, checked: boolean) => void;
}

export default function CodebaseTreeNodeComponent({
  node,
  level,
  nodePath,
  selectedPath,
  selectedFiles,
  onNodeClick,
  onFileCheck,
}: CodebaseTreeNodeProps) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const hasChildren = node.children && node.children.length > 0;
  const isDirectory = node.type === "directory";
  const indentLevel = level * 20 + 8;

  const isSelected = selectedPath === nodePath;
  const isChecked = selectedFiles.has(nodePath);

  useEffect(() => {
    if (!isDirectory) return;
    if (!selectedPath) return;
    // Auto-expand ancestor folders
    if (selectedPath === nodePath || selectedPath.startsWith(`${nodePath}/`)) {
      setIsExpanded(true);
    }
  }, [isDirectory, nodePath, selectedPath]);

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on checkbox
    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
      return;
    }
    
    if (isDirectory && hasChildren) {
      setIsExpanded(!isExpanded);
    }
    onNodeClick(node, nodePath);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onFileCheck(nodePath, e.target.checked);
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
          isSelected
            ? theme === "light"
              ? "bg-blue-100 text-blue-700"
              : "bg-blue-900/30 text-blue-300"
            : theme === "light"
            ? "hover:bg-gray-100 text-gray-700"
            : "hover:bg-gray-800 hover:text-gray-300"
        }`}
        style={{ paddingLeft: `${indentLevel}px` }}
        onClick={handleClick}
      >
        {isDirectory && hasChildren && (
          <span className="flex items-center justify-center w-4 h-4 shrink-0">
            {isExpanded ? (
              <ChevronDown
                className={`w-3.5 h-3.5 ${
                  theme === "light" ? "text-gray-500" : "text-gray-400"
                }`}
              />
            ) : (
              <ChevronRight
                className={`w-3.5 h-3.5 ${
                  theme === "light" ? "text-gray-500" : "text-gray-400"
                }`}
              />
            )}
          </span>
        )}
        {!isDirectory && hasChildren && <span className="w-4 h-4 shrink-0" />}

        {/* Checkbox only for files */}
        {!isDirectory && (
          <input
            type="checkbox"
            checked={isChecked}
            onChange={handleCheckboxChange}
            className="w-4 h-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {isDirectory ? (
          isExpanded ? (
            <FolderOpen
              className={`w-4 h-4 ${
                theme === "light" ? "text-blue-500" : "text-blue-400"
              } shrink-0`}
            />
          ) : (
            <Folder
              className={`w-4 h-4 ${
                theme === "light" ? "text-blue-500" : "text-blue-400"
              } shrink-0`}
            />
          )
        ) : (
          getFileIcon(
            node.name,
            `w-4 h-4 ${
              theme === "light" ? "text-gray-500" : "text-gray-400"
            } shrink-0`
          )
        )}

        <span className="text-sm truncate flex-1 min-w-0" title={node.name}>
          {node.name}
        </span>

        {!isDirectory && node.extension && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              theme === "light"
                ? "bg-gray-200 text-gray-600"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            {node.extension}
          </span>
        )}
      </div>

      {hasChildren && (
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? "max-h-[10000px] opacity-100" : "max-h-0 opacity-0"
          }`}
          style={{
            transitionProperty: "max-height, opacity",
          }}
        >
          <div
            className={`transform transition-all duration-300 ease-in-out ${
              isExpanded ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
            }`}
          >
            {node.children!.map((child, index) => {
              const childPath = `${nodePath}/${child.name}`;
              return (
                <CodebaseTreeNodeComponent
                  key={`${childPath}-${index}`}
                  node={child}
                  level={level + 1}
                  nodePath={childPath}
                  selectedPath={selectedPath}
                  selectedFiles={selectedFiles}
                  onNodeClick={onNodeClick}
                  onFileCheck={onFileCheck}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
