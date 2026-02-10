"use client";
/**
 * @file SidebarContext.tsx
 * @description React context for managing sidebar collapsed state with toggle and setter functions.
 */

import { createContext, useContext, useMemo, useState } from "react";

type SidebarContextValue = {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | undefined>(
  undefined,
);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setCollapsed] = useState(true);

  const value = useMemo(
    () => ({
      isCollapsed,
      toggleSidebar: () => setCollapsed((prev) => !prev),
      setCollapsed,
    }),
    [isCollapsed],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

