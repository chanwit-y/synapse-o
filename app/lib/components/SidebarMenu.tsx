"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebar } from "./SidebarContext";
import { useTheme } from "./ThemeProvider";

export type SidebarMenuItem = {
  label: string;
  href: string;
  description?: string;
  icon?: React.ReactNode;
};

export default function SidebarMenu({
  title = "Menu",
  items,
}: {
  title?: string;
  items: SidebarMenuItem[];
}) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const activeHref =
    items
      .filter((item) =>
        pathname
          ? pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href))
          : false,
      )
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;

  return (
    <aside
      className={[
        "shrink-0 border-r transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        theme === "light"
          ? "border-gray-200 bg-white"
          : "border-gray-800 bg-gray-900",
      ].join(" ")}
      aria-label="Sidebar menu"
      aria-expanded={!isCollapsed}
    >
      <div className="flex h-full flex-col gap-3 p-4">
        {!isCollapsed ? (
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {title}
          </div>
        ) : null}
        <nav
          className={[
            "flex flex-col gap-1",
            "transition-all duration-300",
            isCollapsed ? "items-center" : "",
          ].join(" ")}
        >
          {items.map((item) => {
            const isActive = activeHref === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={[
                  "rounded-md px-3 py-2 text-sm transition-all duration-300",
                  "transition-opacity",
                  isCollapsed ? "w-10 text-center" : "w-full",
                  isActive
                    ? theme === "light"
                      ? "bg-gray-100 text-gray-900"
                      : "bg-gray-800 text-gray-100"
                    : theme === "light"
                      ? "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      : "text-gray-300 hover:bg-gray-800 hover:text-gray-100",
                ].join(" ")}
                aria-current={isActive ? "page" : undefined}
              >
                <div
                  className={[
                    "flex items-center",
                    "transition-all duration-300",
                    isCollapsed ? "justify-center" : "gap-2",
                  ].join(" ")}
                >
                  {item.icon ? (
                    <span className="text-base leading-none">{item.icon}</span>
                  ) : null}
                  <span
                    className={[
                      "font-medium whitespace-nowrap",
                      "transition-all duration-300 origin-left",
                      isCollapsed
                        ? "scale-90 opacity-0 max-w-0"
                        : "scale-100 opacity-100 max-w-48",
                    ].join(" ")}
                  >
                    {item.label}
                  </span>
                </div>
                {!isCollapsed && item.description ? (
                  <div className="text-xs text-gray-500 transition-opacity duration-300">
                    {item.description}
                  </div>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div
          className={[
            "mt-auto pt-3 border-t",
            isCollapsed ? "flex justify-center" : "",
            theme === "light" ? "border-gray-200" : "border-gray-800",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={toggleSidebar}
            className={[
              "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
              theme === "light"
                ? "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                : "text-gray-300 hover:bg-gray-800 hover:text-gray-100",
            ].join(" ")}
            aria-label={isCollapsed ? "Show menu" : "Hide menu"}
            aria-pressed={!isCollapsed}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

