"use client";
/**
 * @file AppBar.tsx
 * @description Top navigation bar component displaying logo, app title, and a theme toggle button.
 */

import { useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";
import Logo from "./Logo";
import ThemeToggleIcon from "./ThemeToggleIcon";

export default function AppBar() {
  const { theme, toggleTheme } = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 w-full border-b backdrop-blur-sm",
        theme === "light"
          ? "border-gray-200 bg-white/80"
          : "border-gray-800 bg-gray-900/80",
      ].join(" ")}
    >
      <div className="mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Logo />
          <h1
            className={[
              "text-xl font-semibold",
              theme === "light" ? "text-gray-900" : "text-gray-100",
            ].join(" ")}
          >
            Synapse
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <svg
              className={[
                "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
                theme === "light" ? "text-gray-400" : "text-gray-500",
              ].join(" ")}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search docs..."
              className={[
                "h-9 w-56 rounded-lg border pl-9 pr-14 text-sm outline-none transition-colors",
                "placeholder:text-gray-400",
                theme === "light"
                  ? "border-gray-200 bg-gray-100 text-gray-900 focus:border-blue-400 focus:bg-white"
                  : "border-gray-700 bg-gray-800 text-gray-100 focus:border-blue-500 focus:bg-gray-700",
              ].join(" ")}
            />
            <kbd
              className={[
                "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border px-1.5 py-0.5 text-xs font-medium",
                theme === "light"
                  ? "border-gray-300 bg-white text-gray-500"
                  : "border-gray-600 bg-gray-700 text-gray-400",
              ].join(" ")}
            >
              ⌘K
            </kbd>
          </div>

          <button
            onClick={toggleTheme}
            className={[
              "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
              theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-800",
            ].join(" ")}
            aria-label="Toggle theme"
          >
            <ThemeToggleIcon theme={theme} />
          </button>
        </div>
      </div>
    </header>
  );
}

