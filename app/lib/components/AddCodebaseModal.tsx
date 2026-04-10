"use client";

import { Plus, Save, FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import Modal from "@/app/lib/components/Modal";

interface AddCodebaseModalProps {
  isOpen: boolean;
  isDark: boolean;
  name: string;
  description: string;
  importSrcPath: string;
  isSaving: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onImportSrcPathChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function AddCodebaseModal({
  isOpen,
  isDark,
  name,
  description,
  importSrcPath,
  isSaving,
  onNameChange,
  onDescriptionChange,
  onImportSrcPathChange,
  onClose,
  onSave,
}: AddCodebaseModalProps) {
  const inputClasses = `w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    isDark
      ? "border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
      : "border-gray-300 bg-white text-gray-900 placeholder-gray-400"
  }`;
  const labelClasses = `block text-sm font-medium mb-1.5 ${isDark ? "text-gray-200" : "text-gray-700"}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center h-10 w-10 rounded-lg ${
              isDark ? "bg-blue-950 text-blue-400" : "bg-blue-50 text-blue-600"
            }`}
          >
            <Plus className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold">Add Codebase</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="add-name" className={labelClasses}>
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="add-name"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g., My Backend Service"
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="add-description" className={labelClasses}>
              Description
            </label>
            <textarea
              id="add-description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Optional — describe what this codebase contains"
              rows={3}
              className={inputClasses}
              style={{ resize: "vertical" }}
            />
          </div>

          <div>
            <label htmlFor="add-import-src-path" className={labelClasses}>
              Import Src Path <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                id="add-import-src-path"
                type="text"
                value={importSrcPath}
                readOnly
                placeholder="Select a folder..."
                className={`${inputClasses} font-mono flex-1 cursor-default`}
              />
              <button
                type="button"
                onClick={async () => {
                  const selected = await open({ directory: true, multiple: false });
                  if (selected) onImportSrcPathChange(selected as string);
                }}
                className={`shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  isDark
                    ? "border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <FolderOpen className="h-4 w-4" />
                Browse
              </button>
            </div>
            <p className={`mt-1.5 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              The source path to import from.
            </p>
          </div>

        </div>

        <div className={`flex justify-end gap-3 pt-3 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isDark
                ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!name.trim() || !importSrcPath.trim() || isSaving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Codebase"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
