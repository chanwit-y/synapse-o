"use client";

import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { SortField } from "@/app/ui/codebase/types";

interface CodebaseToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sortField: SortField;
  sortDir: "asc" | "desc";
  onToggleSort: (field: SortField) => void;
  mutedText: string;
  inputBg: string;
  sortBtnBase: string;
  sortBtnActive: string;
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: "asc" | "desc" }) {
  if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  return sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
}

const SORT_FIELDS: { field: SortField; label: string }[] = [
  { field: "name", label: "Name" },
  { field: "createdAt", label: "Created" },
  { field: "updatedAt", label: "Updated" },
];

export default function CodebaseToolbar({
  search,
  onSearchChange,
  sortField,
  sortDir,
  onToggleSort,
  mutedText,
  inputBg,
  sortBtnBase,
  sortBtnActive,
}: CodebaseToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
      <div className="relative flex-1 w-full sm:max-w-sm">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${mutedText}`} />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, description, or path..."
          className={`w-full rounded-lg border pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <span className={`text-xs font-medium mr-1 ${mutedText}`}>Sort:</span>
        {SORT_FIELDS.map(({ field, label }) => (
          <button
            key={field}
            type="button"
            onClick={() => onToggleSort(field)}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              sortField === field ? sortBtnActive : sortBtnBase
            }`}
          >
            {label}
            <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
          </button>
        ))}
      </div>
    </div>
  );
}
