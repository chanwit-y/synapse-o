"use client";
/**
 * @file AppBar.tsx
 * @description Top navigation bar component displaying logo, app title, and a theme toggle button.
 */

import { useTheme } from "./ThemeProvider";
import Logo from "./Logo";
import ThemeToggleIcon from "./ThemeToggleIcon";

export default function AppBar() {
  const { theme, toggleTheme } = useTheme();

  return (
    // <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">
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
    </header>
  );
}

