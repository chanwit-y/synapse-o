"use client";

import AppBar from "./AppBar";
import { useTheme } from "./ThemeProvider";

export default function LayoutShell({
  children,
  sidebar,
}: {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <div
      className={[
        "flex flex-col h-screen",
        theme === "light"
          ? "bg-white text-gray-900"
          : "bg-gray-900 text-gray-100",
      ].join(" ")}
    >
      <AppBar />
      <div className="flex flex-1 overflow-hidden">
        {sidebar}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}


