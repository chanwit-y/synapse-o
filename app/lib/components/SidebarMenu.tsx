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
        "h-[calc(100vh-4rem)]",
      ].join(" ")}
      aria-label="Sidebar menu"
      aria-expanded={!isCollapsed}
    >
      <div className="flex h-full min-h-0 flex-col gap-3 p-4">
        {!isCollapsed ? (
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {title}
          </div>
        ) : null}
        <nav
          className={[
            "flex flex-1 min-h-0 flex-col gap-1 overflow-auto",
            "transition-all duration-300 ease-in-out",
            isCollapsed ? "items-center" : "",
          ].join(" ")}
        >
          {items.map((item, index) => {
            const isActive = activeHref === item.href;

            return (
              <Link
                key={`${item.href}-${isCollapsed ? "collapsed" : "expanded"}`}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                // 2. Added animation delay style for the staggered effect
                // style={{ animationDelay: `${index * 0.05}s` }} 
                style={{ animationDelay: `${index * 150}ms` }}
                className={[
                  "animate-slide-in-left opacity-0", 
                  "rounded-xl px-3 py-2 text-sm",
                  "opacity-0 animate-fade-in",
                  "transition-all duration-500 ease-in-out",
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
                    <span className="text-base leading-none shrink-0">{item.icon}</span>
                  ) : null}

                  <span
                    className={[
                      "font-medium whitespace-nowrap overflow-hidden",
                      // 5. Refined text transition for smoother fade in/out on collapse
                      "transition-all duration-500 ease-in-out origin-left",
                      isCollapsed
                        ? "w-0 scale-90 opacity-0 translate-x-[-10px]" // Fades out and slides left
                        : "w-auto scale-100 opacity-100 translate-x-0",
                    ].join(" ")}
                  >
                    {item.label}
                  </span>
                </div>

                {!isCollapsed && item.description ? (
                  <div className="text-xs text-gray-500 transition-opacity duration-500 animate-fade-in">
                    {item.description}
                  </div>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <footer
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
        </footer>
      </div>
    </aside>
  );
}

