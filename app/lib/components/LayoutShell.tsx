"use client";
/**
 * @file LayoutShell.tsx
 * @description Layout wrapper component providing app bar, sidebar context, and theme support to child components.
 */

import AppBar from "./AppBar";
import { SidebarProvider } from "./SidebarContext";
import { useTheme } from "./ThemeProvider";

export default function LayoutShell({
  children,
  // sidebar,
}: {
  children: React.ReactNode;
  // sidebar?: React.ReactNode;
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
      <SidebarProvider>
        <AppBar />
        <div className="flex overflow-hidden">
          {/* {sidebar} */}
          {/* <main className="flex-1 overflow-auto">{children}</main> */}
          {children}
        </div>
      </SidebarProvider>
    </div>
  );
}


