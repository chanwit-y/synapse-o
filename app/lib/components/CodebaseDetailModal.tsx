"use client";

import { Code, X } from "lucide-react";
import type { CodebaseRow } from "@/app/lib/db/repository/codebase";
import Modal from "@/app/lib/components/Modal";
import { formatDate } from "@/app/ui/codebase/types";

interface CodebaseDetailModalProps {
  item: CodebaseRow | null;
  isDark: boolean;
  onClose: () => void;
}

function DetailRow({
  label,
  isDark,
  children,
}: {
  label: string;
  isDark: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        {label}
      </label>
      <div
        className={`rounded-md border px-3 py-2 text-sm ${
          isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default function CodebaseDetailModal({ item, isDark, onClose }: CodebaseDetailModalProps) {
  const mutedText = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <Modal isOpen={!!item} onClose={onClose} size="md">
      {item && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center h-10 w-10 rounded-lg ${
                isDark ? "bg-blue-950 text-blue-400" : "bg-blue-50 text-blue-600"
              }`}
            >
              <Code className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{item.name}</h2>
              <p className={`text-xs ${mutedText}`}>ID: {item.id}</p>
            </div>
          </div>

          <div className="space-y-3">
            <DetailRow label="Description" isDark={isDark}>
              {item.description || <span className={`italic ${mutedText}`}>None</span>}
            </DetailRow>

            <DetailRow label="Code Mapping" isDark={isDark}>
              <code
                className={`text-xs font-mono break-all ${
                  isDark ? "text-emerald-400" : "text-emerald-700"
                }`}
              >
                {item.importFilePath}
              </code>
            </DetailRow>

            <div className="grid grid-cols-2 gap-3">
              <DetailRow label="Created At" isDark={isDark}>
                {formatDate(item.createdAt)}
              </DetailRow>
              <DetailRow label="Updated At" isDark={isDark}>
                {formatDate(item.updatedAt)}
              </DetailRow>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isDark
                  ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
