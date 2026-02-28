"use client";

import Link from "next/link";
import { Code, Eye, Trash2, FolderOpen, Calendar, ExternalLink, Play } from "lucide-react";
import type { CodebaseRow } from "@/app/lib/db/repository/codebase";
import { formatDate } from "@/app/ui/codebase/types";

interface CodebaseCardProps {
  codebase: CodebaseRow;
  isDark: boolean;
  cardBg: string;
  cardHover: string;
  mutedText: string;
  pillBg: string;
  onView: (codebase: CodebaseRow) => void;
  onDelete: (codebase: CodebaseRow) => void;
  onRun: (codebase: CodebaseRow) => void;
}

export default function CodebaseCard({
  codebase,
  isDark,
  cardBg,
  cardHover,
  mutedText,
  pillBg,
  onView,
  onDelete,
  onRun
}: CodebaseCardProps) {
  return (
    <div className={`group relative rounded-xl border p-5 transition-all duration-200 ${cardBg} ${cardHover}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`shrink-0 flex items-center justify-center h-9 w-9 rounded-lg ${
              isDark ? "bg-blue-950 text-blue-400" : "bg-blue-50 text-blue-600"
            }`}
          >
            <Code className="h-4.5 w-4.5" />
          </div>
          <h3 className="text-sm font-semibold truncate" title={codebase.name}>
            {codebase.name}
          </h3>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Link
            href={`/ui/codebase/${codebase.id}`}
            className={`p-1.5 rounded-md transition-colors ${
              isDark ? "hover:bg-gray-700 text-gray-400 hover:text-emerald-400" : "hover:bg-emerald-50 text-gray-400 hover:text-emerald-600"
            }`}
            title="Show detail"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => onView(codebase)}
            className={`p-1.5 rounded-md transition-colors ${
              isDark ? "hover:bg-gray-700 text-gray-400 hover:text-blue-400" : "hover:bg-blue-50 text-gray-400 hover:text-blue-600"
            }`}
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onRun(codebase)}
            className={`p-1.5 rounded-md transition-colors ${
              isDark ? "hover:bg-gray-700 text-gray-400 hover:text-green-400" : "hover:bg-green-50 text-gray-400 hover:text-green-600"
            }`}
            title="Run"
          >
            <Play className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(codebase)}
            className={`p-1.5 rounded-md transition-colors ${
              isDark ? "hover:bg-red-950 text-gray-400 hover:text-red-400" : "hover:bg-red-50 text-gray-400 hover:text-red-600"
            }`}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className={`text-xs leading-relaxed line-clamp-2 mb-4 min-h-10 ${mutedText}`}>
        {codebase.description || "No description provided."}
      </p>

      <div className="space-y-1.5">
        <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-mono truncate ${pillBg}`}>
          <FolderOpen className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <span className="truncate" title={codebase.importSrcPath}>
            {codebase.importSrcPath}
          </span>
        </div>
        <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-mono truncate ${pillBg}`}>
          <FolderOpen className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <span className="truncate" title={codebase.importFilePath}>
            {codebase.importFilePath}
          </span>
        </div>
      </div>

      <div className={`flex items-center gap-4 mt-3 text-[11px] ${mutedText}`}>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDate(codebase.createdAt)}
        </span>
      </div>
    </div>
  );
}
