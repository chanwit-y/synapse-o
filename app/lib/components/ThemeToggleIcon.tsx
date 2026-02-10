"use client";
/**
 * @file ThemeToggleIcon.tsx
 * @description A simple SVG icon component that displays either a moon or sun icon based on the current light/dark theme.
 */

type Theme = "light" | "dark";

const MOON_PATH_D =
  "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z";

const SUN_PATH_D =
  "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z";

export default function ThemeToggleIcon({ theme }: { theme: Theme }) {
  if (theme === "light") {
    return (
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
          d={MOON_PATH_D}
        />
      </svg>
    );
  }

  return (
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
        d={SUN_PATH_D}
      />
    </svg>
  );
}


