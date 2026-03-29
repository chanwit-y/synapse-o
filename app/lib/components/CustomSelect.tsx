"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  theme: string;
  ariaLabel?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  theme,
  ariaLabel,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isDark = theme === "dark";

  const selectedLabel = options.find((o) => o.value === value)?.label;
  const showSearch = options.length > 5;

  const filtered = search.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1);
      setSearch("");
      requestAnimationFrame(() => {
        if (showSearch && searchInputRef.current) {
          searchInputRef.current.focus();
        }
      });
    }
  }, [isOpen, showSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[role='option']");
      items[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filtered.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev <= 0 ? filtered.length - 1 : prev - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          handleSelect(filtered[highlightedIndex].value);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={[
          "w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/40",
          isDark
            ? "border-gray-700 bg-gray-900 text-gray-100 hover:border-gray-500"
            : "border-gray-300 bg-white text-gray-900 hover:border-gray-400",
          isOpen
            ? isDark
              ? "border-blue-500/60 ring-2 ring-blue-500/20"
              : "border-blue-500 ring-2 ring-blue-500/20"
            : "",
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span
          className={[
            "truncate",
            selectedLabel
              ? ""
              : isDark
                ? "text-gray-500"
                : "text-gray-400",
          ].join(" ")}
        >
          {selectedLabel || placeholder || "Select\u2026"}
        </span>
        <ChevronDown
          className={[
            "h-4 w-4 shrink-0 transition-transform duration-200",
            isDark ? "text-gray-400" : "text-gray-500",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {isOpen && (
        <div
          className={[
            "absolute z-50 mt-1.5 w-full rounded-lg border shadow-xl",
            isDark
              ? "border-gray-700 bg-gray-900"
              : "border-gray-200 bg-white",
          ].join(" ")}
          style={{ animation: "customSelectFadeIn 120ms ease-out" }}
          role="listbox"
        >
          <style>{`
            @keyframes customSelectFadeIn {
              from { opacity: 0; transform: translateY(-4px) scale(0.98); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          {showSearch && (
            <div className="px-2 pt-2">
              <div className="relative">
                <Search
                  className={[
                    "pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2",
                    isDark ? "text-gray-500" : "text-gray-400",
                  ].join(" ")}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setHighlightedIndex(-1);
                  }}
                  placeholder="Search\u2026"
                  className={[
                    "w-full rounded-md border py-1.5 pl-8 pr-3 text-sm",
                    "focus:outline-none focus:ring-1 focus:ring-blue-500/40",
                    isDark
                      ? "border-gray-700 bg-gray-800 text-gray-100 placeholder:text-gray-500"
                      : "border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400",
                  ].join(" ")}
                />
              </div>
            </div>
          )}

          <div ref={listRef} className="max-h-60 overflow-auto p-1">
            {filtered.length === 0 ? (
              <div
                className={[
                  "px-3 py-6 text-center text-sm",
                  isDark ? "text-gray-500" : "text-gray-400",
                ].join(" ")}
              >
                No results found
              </div>
            ) : (
              filtered.map((option, idx) => {
                const isSelected = value === option.value;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={[
                      "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors duration-100",
                      isSelected
                        ? isDark
                          ? "bg-blue-500/15 text-blue-400 font-medium"
                          : "bg-blue-50 text-blue-700 font-medium"
                        : isHighlighted
                          ? isDark
                            ? "bg-gray-800 text-gray-100"
                            : "bg-gray-100 text-gray-900"
                          : isDark
                            ? "text-gray-300 hover:bg-gray-800"
                            : "text-gray-700 hover:bg-gray-50",
                    ].join(" ")}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="flex-1 truncate">{option.label}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-blue-500" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
