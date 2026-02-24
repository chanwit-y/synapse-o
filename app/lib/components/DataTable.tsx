"use client";
/**
 * @file DataTable.tsx
 * @description An editable data table component that stores/loads tabular data as JSON.
 * Supports adding/removing rows and columns, inline cell editing, and file persistence.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Save, Trash2, GripVertical } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useSnackbar } from "./Snackbar";
import { useFileContentQuery, useSaveFileMutation } from "../services/fileService.client";
import type { TreeNode } from "./@types/treeViewTypes";

export interface DataTableData {
  columns: string[];
  rows: string[][];
}

const EMPTY_TABLE: DataTableData = {
  columns: ["Column 1", "Column 2", "Column 3"],
  rows: [["", "", ""]],
};

function parseTableData(raw: string | null | undefined): DataTableData {
  if (!raw?.trim()) return structuredClone(EMPTY_TABLE);
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "columns" in parsed &&
      "rows" in parsed &&
      Array.isArray((parsed as DataTableData).columns) &&
      Array.isArray((parsed as DataTableData).rows)
    ) {
      return parsed as DataTableData;
    }
  } catch {
    /* ignore */
  }
  return structuredClone(EMPTY_TABLE);
}

export default function DataTable({ selectedFile }: { selectedFile: TreeNode | null }) {
  const { theme } = useTheme();
  const { showSnackbar } = useSnackbar();
  const saveFileMutation = useSaveFileMutation();

  const selectedFileId = selectedFile?.id ?? null;
  const { data: loadedContent } = useFileContentQuery(selectedFileId);
  const lastHydratedFileIdRef = useRef<string | null>(null);
  const fileIdRef = useRef<string | null>(null);

  const [tableData, setTableData] = useState<DataTableData>(structuredClone(EMPTY_TABLE));
  const [editingHeader, setEditingHeader] = useState<number | null>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = selectedFile?.id ?? null;
    fileIdRef.current = id;
    lastHydratedFileIdRef.current = null;

    if (!id) {
      setTableData(structuredClone(EMPTY_TABLE));
      return;
    }

    setTableData(parseTableData(selectedFile?.content));
  }, [selectedFile?.content, selectedFile?.id]);

  useEffect(() => {
    const id = selectedFile?.id ?? null;
    if (!id) return;
    if (loadedContent === undefined) return;
    if (lastHydratedFileIdRef.current === id) return;
    lastHydratedFileIdRef.current = id;
    setTableData(parseTableData(loadedContent));
  }, [loadedContent, selectedFile?.id]);

  useEffect(() => {
    if (editingHeader !== null) {
      headerInputRef.current?.focus();
      headerInputRef.current?.select();
    }
  }, [editingHeader]);

  const updateCell = useCallback((rowIndex: number, colIndex: number, value: string) => {
    setTableData((prev) => {
      const newRows = prev.rows.map((row) => [...row]);
      newRows[rowIndex][colIndex] = value;
      return { ...prev, rows: newRows };
    });
  }, []);

  const updateColumnName = useCallback((colIndex: number, value: string) => {
    setTableData((prev) => {
      const newColumns = [...prev.columns];
      newColumns[colIndex] = value;
      return { ...prev, columns: newColumns };
    });
  }, []);

  const addRow = useCallback(() => {
    setTableData((prev) => ({
      ...prev,
      rows: [...prev.rows, prev.columns.map(() => "")],
    }));
  }, []);

  const removeRow = useCallback((rowIndex: number) => {
    setTableData((prev) => {
      if (prev.rows.length <= 1) return prev;
      return { ...prev, rows: prev.rows.filter((_, i) => i !== rowIndex) };
    });
  }, []);

  const addColumn = useCallback(() => {
    setTableData((prev) => ({
      columns: [...prev.columns, `Column ${prev.columns.length + 1}`],
      rows: prev.rows.map((row) => [...row, ""]),
    }));
  }, []);

  const removeColumn = useCallback((colIndex: number) => {
    setTableData((prev) => {
      if (prev.columns.length <= 1) return prev;
      return {
        columns: prev.columns.filter((_, i) => i !== colIndex),
        rows: prev.rows.map((row) => row.filter((_, i) => i !== colIndex)),
      };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedFile) {
      showSnackbar({ title: "Save", message: "Please select a file to save.", variant: "warning" });
      return;
    }

    try {
      const content = JSON.stringify(tableData, null, 2);
      const result = await saveFileMutation.mutateAsync({
        id: fileIdRef.current,
        name: selectedFile.name || "untitled.datatable",
        collectionId: selectedFile.collectionId,
        content,
      });

      fileIdRef.current = result.id!;
      showSnackbar({
        title: "Saved",
        message: `Saved "${selectedFile.name || "untitled.datatable"}"`,
        variant: "success",
      });
    } catch (error) {
      console.error("Error saving datatable:", error);
      showSnackbar({
        title: "Error",
        message: error instanceof Error ? error.message : "Error saving. Please try again.",
        variant: "error",
      });
    }
  }, [saveFileMutation, selectedFile, showSnackbar, tableData]);

  const isDark = theme === "dark";

  const thBg = isDark ? "bg-gray-800" : "bg-gray-100";
  const borderColor = isDark ? "border-gray-700" : "border-gray-200";
  const cellBg = isDark ? "bg-gray-900" : "bg-white";
  const textColor = isDark ? "text-gray-100" : "text-gray-900";
  const mutedText = isDark ? "text-gray-400" : "text-gray-500";
  const hoverBg = isDark ? "hover:bg-gray-800" : "hover:bg-gray-50";
  const btnBg = isDark ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200";

  return (
    <div className="w-full p-4 space-y-3" style={{ maxWidth: "100%" }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className={`text-xs font-semibold uppercase tracking-wide ${mutedText}`}>
          Data Table
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addColumn}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${btnBg} ${textColor}`}
            title="Add Column"
          >
            <Plus className="h-3.5 w-3.5" /> Column
          </button>
          <button
            type="button"
            onClick={addRow}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${btnBg} ${textColor}`}
            title="Add Row"
          >
            <Plus className="h-3.5 w-3.5" /> Row
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
            title="Save"
          >
            <Save className="h-3.5 w-3.5" /> Save
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-lg border" style={{ maxHeight: "calc(100vh - 240px)" }}>
        <table className={`w-full border-collapse text-sm ${borderColor}`}>
          <thead className="sticky top-0 z-10">
            <tr>
              <th
                className={`w-10 border ${borderColor} ${thBg} px-2 py-2 text-center ${mutedText}`}
              >
                #
              </th>
              {tableData.columns.map((col, colIndex) => (
                <th
                  key={colIndex}
                  className={`border ${borderColor} ${thBg} px-3 py-2 text-left font-semibold ${textColor} min-w-[120px] group relative`}
                >
                  {editingHeader === colIndex ? (
                    <input
                      ref={headerInputRef}
                      type="text"
                      value={col}
                      onChange={(e) => updateColumnName(colIndex, e.target.value)}
                      onBlur={() => setEditingHeader(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Escape") setEditingHeader(null);
                      }}
                      className={`w-full bg-transparent border-b-2 border-blue-500 outline-none text-sm font-semibold ${textColor} px-0 py-0`}
                    />
                  ) : (
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="cursor-pointer truncate"
                        onDoubleClick={() => setEditingHeader(colIndex)}
                        title="Double-click to rename"
                      >
                        {col}
                      </span>
                      {tableData.columns.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeColumn(colIndex)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity text-red-400 hover:text-red-500"
                          title="Remove column"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </th>
              ))}
              <th className={`w-10 border ${borderColor} ${thBg}`} />
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={`${hoverBg} transition-colors`}>
                <td
                  className={`border ${borderColor} ${thBg} px-2 py-1.5 text-center text-xs ${mutedText} select-none`}
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <GripVertical className="h-3 w-3 opacity-30" />
                    {rowIndex + 1}
                  </div>
                </td>
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className={`border ${borderColor} ${cellBg} px-0 py-0`}
                  >
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      className={`w-full bg-transparent px-3 py-1.5 text-sm ${textColor} outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/40`}
                    />
                  </td>
                ))}
                <td className={`border ${borderColor} ${thBg} px-1 py-1.5 text-center`}>
                  {tableData.rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(rowIndex)}
                      className="p-0.5 rounded transition-colors text-red-400 hover:text-red-500 hover:bg-red-500/10"
                      title="Remove row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className={`flex items-center justify-between text-xs ${mutedText}`}>
        <span>{tableData.rows.length} row{tableData.rows.length !== 1 ? "s" : ""} &times; {tableData.columns.length} column{tableData.columns.length !== 1 ? "s" : ""}</span>
        <span>Double-click column headers to rename</span>
      </div>
    </div>
  );
}
