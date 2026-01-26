"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTheme } from "./ThemeProvider";

type Tag = {
  id: string;
  label: string;
  color: string;
};

const DEFAULT_COLOR = "#60a5fa";
const PRESET_COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa"];

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

export default function TagEditor() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [tags, setTags] = useState<Tag[]>([]);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const tagRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement | null>(null);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);

  const handleAddTag = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setTags((prev) => [
      ...prev,
      { id: createId(), label: trimmed, color },
    ]);
    setLabel("");
  };

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
        <div
          className={[
            "flex flex-wrap items-center gap-2 rounded-md border px-2 py-2 text-sm transition-colors",
            isDark
              ? "border-gray-700 bg-gray-900 text-gray-100"
              : "border-gray-200 bg-white text-gray-900",
          ].join(" ")}
        >
          {tags.map((tag) => {
            const textColor = getReadableTextColor(tag.color);
            const isTagPickerOpen = activeTagId === tag.id;
            return (
              <div
                key={tag.id}
                ref={(node) => {
                  tagRefs.current[tag.id] = node;
                }}
                className="relative flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
                style={{ backgroundColor: tag.color, color: textColor }}
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
                <span>{tag.label}</span>
                <button
                  type="button"
                  onClick={() =>
                    setTags((prev) => prev.filter((item) => item.id !== tag.id))
                  }
                  className="rounded-full p-0.5 transition-opacity hover:opacity-80"
                  style={{ color: textColor }}
                  aria-label={`Remove ${tag.label}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {isTagPickerOpen ? (
                  <div
                    ref={colorPickerRef}
                    className={[
                      "absolute left-0 top-full z-20 mt-2 w-48 rounded-md border p-3 shadow-lg",
                      isDark
                        ? "border-gray-700 bg-gray-900"
                        : "border-gray-200 bg-white",
                    ].join(" ")}
                  >
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setTags((prev) =>
                              prev.map((item) =>
                                item.id === tag.id
                                  ? { ...item, color: preset }
                                  : item,
                              ),
                            );
                            setActiveTagId(null);
                          }}
                          className={[
                            "h-6 w-6 rounded-full border transition-transform",
                            preset === tag.color
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
                        value={tag.color}
                        onChange={(event) => {
                          const nextColor = event.target.value;
                          setTags((prev) =>
                            prev.map((item) =>
                              item.id === tag.id
                                ? { ...item, color: nextColor }
                                : item,
                            ),
                          );
                        }}
                        className="h-8 w-full cursor-pointer rounded-md border border-gray-300 bg-transparent p-1"
                        aria-label={`Custom color for ${tag.label}`}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          <input
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAddTag();
              }
            }}
            placeholder={tags.length === 0 ? "Add a tag" : ""}
            className={[
              "h-8 min-w-32 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-gray-400",
              isDark ? "text-gray-100" : "text-gray-900",
            ].join(" ")}
            aria-label="Tag name"
          />
        </div>
        <div className="relative" ref={colorPickerRef}>
          {/* <button
            type="button"
            onClick={() => setIsColorPickerOpen((prev) => !prev)}
            className={[
              "flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold transition-colors",
              isDark
                ? "border-gray-700 bg-gray-900 text-gray-100"
                : "border-gray-200 bg-white text-gray-900",
            ].join(" ")}
            aria-label="Open tag color picker"
          >
            <span
              className="h-4 w-4 rounded-full border border-gray-300"
              style={{ backgroundColor: color }}
            />
            <span>Color</span>
          </button> */}
          {isColorPickerOpen ? (
            <div
              className={[
                "absolute left-0 top-full z-10 mt-2 w-48 rounded-md border p-3 shadow-lg",
                isDark
                  ? "border-gray-700 bg-gray-900"
                  : "border-gray-200 bg-white",
              ].join(" ")}
            >
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setColor(preset);
                      setIsColorPickerOpen(false);
                    }}
                    className={[
                      "h-6 w-6 rounded-full border transition-transform",
                      preset === color
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
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="h-8 w-full cursor-pointer rounded-md border border-gray-300 bg-transparent p-1"
                  aria-label="Custom tag color"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

