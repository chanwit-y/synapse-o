"use client";

import { useState } from "react";
import AppBar from "./AppBar";
import Sidebar from "./Sidebar";
import { useTheme } from "./ThemeProvider";

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div
      className={[
        "flex flex-col h-screen",
        theme === "light"
          ? "bg-white text-gray-900"
          : "bg-gray-900 text-gray-100",
      ].join(" ")}
    >
      <AppBar
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((v) => !v)}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={isSidebarCollapsed} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}


