"use client";

import type { CodebaseRow } from "@/app/lib/db/repository/codebase";
import Modal from "@/app/lib/components/Modal";

interface DeleteConfirmModalProps {
  target: CodebaseRow | null;
  isDark: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmModal({ target, isDark, onClose, onConfirm }: DeleteConfirmModalProps) {
  return (
    <Modal isOpen={!!target} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Delete Codebase</h2>
        <p className={isDark ? "text-gray-400" : "text-gray-600"}>
          Are you sure you want to delete{" "}
          <span className="font-medium">{target?.name}</span>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg px-4 py-2 font-medium transition-colors ${
              isDark
                ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}
