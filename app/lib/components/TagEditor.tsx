"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { PRESET_COLORS, TAG_SUGGESTIONS } from "../const";
import { updateFileTags } from "@/app/ui/doc/action";
import type { Tag, TagEditorProps } from "./@types/tagEditorTypes";

const DEFAULT_COLOR = "#60a5fa";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getReadableTextColor = (hexColor: string) => {
  const normalized = hexColor.replace("#", "");
  if (normalized.length !== 6) return "#111827";
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.62 ? "#111827" : "#ffffff";
};

export default function TagEditor({ fileId, fileTags, onTagsChange }: TagEditorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [tags, setTags] = useState<Tag[]>(fileTags);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const tagRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement | null>(null);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setTags(fileTags);
  }, [fileTags]);

  const handleTagAction = async (
    action: "add" | "remove",
    payload: { label?: string; tagId?: string }
  ) => {
    if (action === "add") {
      const trimmed = (payload.label ?? label).trim();
      if (!trimmed) return;
      const newTags = [...tags, { id: createId(), label: trimmed, color }];
      setTags(newTags);
      setLabel("");
      setHighlightedIndex(0);
      await updateFileTags(fileId, newTags);
      onTagsChange?.(newTags);
    } else if (action === "remove" && payload.tagId) {
      const newTags = tags.filter((item) => item.id !== payload.tagId);
      setTags(newTags);
      await updateFileTags(fileId, newTags);
      onTagsChange?.(newTags);
    }
  };

  const filteredSuggestions = TAG_SUGGESTIONS.filter((suggestion) => {
    const matchesSearch = suggestion.toLowerCase().includes(label.trim().toLowerCase());
    const notAlreadyAdded = !tags.some((tag) => tag.label.toLowerCase() === suggestion.toLowerCase());
    return matchesSearch && notAlreadyAdded;
  });
  const showSuggestions = isFocused && filteredSuggestions.length > 0;

  useEffect(() => {
    if (!showSuggestions) return;
    setHighlightedIndex(0);
  }, [label, showSuggestions, isFocused]);

  useEffect(() => {
    if (!isColorPickerOpen && !activeTagId) return;
    const handleClickOutside = (event: MouseEvent) => {
      const activeTagNode = activeTagId
        ? tagRefs.current[activeTagId]
        : null;
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target as Node) &&
        !(activeTagNode && activeTagNode.contains(event.target as Node))
      ) {
        setIsColorPickerOpen(false);
        setActiveTagId(null);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isColorPickerOpen, activeTagId]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Tags
        </div>
        <div className="relative">
          <div
            className={[
              "flex max-h-32 min-h-12 flex-wrap items-center gap-2 overflow-y-auto rounded-md border px-2 py-2 text-sm transition-colors",
              isDark
                ? "border-gray-700 bg-gray-900 text-gray-100"
                : "border-gray-200 bg-white text-gray-900",
            ].join(" ")}
          >
            {tags.map((tag) => {
              const textColor = getReadableTextColor(tag.color);
              return (
                <div
                  key={tag.id}
                  ref={(node) => {
                    tagRefs.current[tag.id] = node;
                  }}
                  className="relative flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold"
                  // style={{ backgroundColor: tag.color, color: textColor }}
                  style={{ backgroundColor: tag.color, color: tag.color }}
                  onDoubleClick={() => setActiveTagId(tag.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveTagId(tag.id);
                    }
                  }}
                >
                  <span className="text-white">{tag.label}</span>
                  <button
                    type="button"
                    onClick={() => handleTagAction("remove", { tagId: tag.id })}
                    className="rounded-full p-0.5 transition-opacity hover:opacity-80 text-white"
                    // style={{ color: textColor }}
                    // style={{ color: tag.color }}
                    aria-label={`Remove ${tag.label}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
            <div className="min-w-32 flex-1">
              <input
                type="text"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  // Delay blur to allow click events on suggestions to fire
                  setTimeout(() => setIsFocused(false), 150);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" && showSuggestions) {
                    event.preventDefault();
                    setHighlightedIndex((prev) =>
                      prev + 1 >= filteredSuggestions.length ? 0 : prev + 1,
                    );
                    return;
                  }
                  if (event.key === "ArrowUp" && showSuggestions) {
                    event.preventDefault();
                    setHighlightedIndex((prev) =>
                      prev - 1 < 0 ? filteredSuggestions.length - 1 : prev - 1,
                    );
                    return;
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (showSuggestions) {
                      handleTagAction("add", { label: filteredSuggestions[highlightedIndex] });
                      return;
                    }
                    handleTagAction("add", {});
                  }
                  if (event.key === "Escape") {
                    setLabel("");
                    setIsFocused(false);
                  }
                }}
                placeholder={tags.length === 0 ? "Add a tag" : ""}
                className={[
                  "h-8 w-full bg-transparent px-1 text-sm outline-none placeholder:text-gray-400",
                  isDark ? "text-gray-100" : "text-gray-900",
                ].join(" ")}
                aria-label="Tag name"
                aria-autocomplete="list"
                aria-expanded={showSuggestions}
                aria-controls="tag-suggestions"
              />
            </div>
          </div>
          {showSuggestions ? (
            <div
              id="tag-suggestions"
              role="listbox"
              className={[
                "absolute left-0 top-full z-20 mt-1 w-full rounded-md border p-1.5 text-sm shadow-lg",
                isDark
                  ? "border-gray-700 bg-gray-900 text-gray-100"
                  : "border-gray-200 bg-white text-gray-900",
              ].join(" ")}
            >
              {filteredSuggestions.map((suggestion, index) => {
                const isActive = index === highlightedIndex;
                return (
                  <button
                    key={suggestion}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleTagAction("add", { label: suggestion })}
                    className={[
                      "flex w-full items-center p-2 rounded-md text-left",
                      isActive
                        ? isDark
                          ? "bg-gray-700"
                          : "bg-gray-100"
                        : "bg-transparent",
                    ].join(" ")}
                  >
                    {suggestion}
                  </button>
                );
              })}
            </div>
          ) : null}
          {activeTagId && (() => {
            const activeTag = tags.find((t) => t.id === activeTagId);
            const activeTagElement = tagRefs.current[activeTagId];
            if (!activeTag || !activeTagElement) return null;
            
            return (
              <div
                ref={colorPickerRef}
                className={[
                  "absolute z-30 mt-2 w-48 rounded-md border p-3 shadow-lg",
                  isDark
                    ? "border-gray-700 bg-gray-900"
                    : "border-gray-200 bg-white",
                ].join(" ")}
                style={{
                  top: activeTagElement.offsetTop + activeTagElement.offsetHeight,
                  left: activeTagElement.offsetLeft,
                }}
              >
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={async () => {
                        const newTags = tags.map((item) =>
                          item.id === activeTagId
                            ? { ...item, color: preset }
                            : item,
                        );
                        setTags(newTags);
                        await updateFileTags(fileId, newTags);
                        onTagsChange?.(newTags);
                        setActiveTagId(null);
                      }}
                      className={[
                        "h-6 w-6 rounded-full border transition-transform",
                        preset === activeTag.color
                          ? "scale-110 border-gray-400"
                          : "border-gray-300",
                      ].join(" ")}
                      style={{ backgroundColor: preset }}
                      aria-label={`Select ${preset} tag color`}
                    />
                  ))}
                </div>
                <div className="mt-3">
                  <input
                    type="color"
                    value={activeTag.color}
                    onChange={(event) => {
                      const nextColor = event.target.value;
                      setTags((prev) =>
                        prev.map((item) =>
                          item.id === activeTagId
                            ? { ...item, color: nextColor }
                            : item,
                        ),
                      );
                    }}
                    className="h-8 w-full cursor-pointer rounded-md border border-gray-300 bg-transparent p-1"
                    aria-label={`Custom color for ${activeTag.label}`}
                  />
                </div>
              </div>
            );
          })()}
        </div>
        <div className="relative" ref={colorPickerRef}>
        </div>
      </div>
    </div>
  );
}

