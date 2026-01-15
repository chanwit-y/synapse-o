"use client";

import { useTheme } from "./ThemeProvider";
import Logo from "./Logo";

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
        <div className="flex items-center gap-1">
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
          {theme === "light" ? (
            <svg
              className="h-5 w-5 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}

