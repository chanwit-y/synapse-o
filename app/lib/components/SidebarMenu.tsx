"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, ChevronRight } from "lucide-react";
import { useSidebar } from "./SidebarContext";
import { useTheme } from "./ThemeProvider";

export type SidebarMenuItem = {
  label: string;
  href?: string;
  description?: string;
  icon?: React.ReactNode;
  submenu?: SidebarMenuItem[];
};

function MenuItem({
  item,
  index,
  isCollapsed,
  theme,
  pathname,
  allSubmenuHrefs,
  toggleSidebar,
}: {
  item: SidebarMenuItem;
  index: number;
  isCollapsed: boolean;
  theme: string;
  pathname: string | null;
  allSubmenuHrefs: string[];
  toggleSidebar: () => void;
}) {
  const hasSubmenu = item.submenu && item.submenu.length > 0;

  // Check if any submenu item matches the current path
  const isSubmenuActive = hasSubmenu && item.submenu?.some((subItem) =>
    pathname && subItem.href ? pathname === subItem.href : false
  );

  // Auto-expand if a submenu item is active
  const [isExpanded, setIsExpanded] = useState(isSubmenuActive || false);

  // For regular menu items (without submenu):
  // - Active if exact match OR path starts with href
  // - BUT not active if the path matches any submenu href from other menu items
  const isActive = pathname && item.href && !hasSubmenu
    ? pathname === item.href || 
      (item.href !== "/ui" && pathname.startsWith(item.href) && !allSubmenuHrefs.some(subHref => pathname.startsWith(subHref)))
    : false;

  // Update expanded state when submenu becomes active
  React.useEffect(() => {
    if (isSubmenuActive) {
      setIsExpanded(true);
    }
  }, [isSubmenuActive]);

  // Handle click on menu item with submenu
  const handleSubmenuClick = () => {
    // If sidebar is collapsed, expand it first
    if (isCollapsed) {
      toggleSidebar();
      setIsExpanded(true);
    } else {
      // If sidebar is already expanded, toggle submenu
      setIsExpanded(!isExpanded);
    }
  };

  if (hasSubmenu) {
    return (
      <div key={`${item.label}-${index}`}>
        <button
          type="button"
          onClick={handleSubmenuClick}
          title={isCollapsed ? item.label : undefined}
          style={{ animationDelay: `${index * 150}ms` }}
          className={[
            "animate-slide-in-left opacity-0",
            "rounded-xl px-3 py-2 text-sm w-full",
            "opacity-0 animate-fade-in",
            "transition-all duration-300 ease-in-out",
            "active:scale-95",
            isCollapsed ? "text-center" : "",
            // Parent menu never shows as active, only hover state
            theme === "light"
              ? "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              : "text-gray-300 hover:bg-gray-800 hover:text-gray-100",
          ].join(" ")}
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
                "transition-all duration-500 ease-in-out origin-left",
                isCollapsed
                  ? "w-0 scale-90 opacity-0 translate-x-[-10px]"
                  : "w-auto scale-100 opacity-100 translate-x-0",
              ].join(" ")}
            >
              {item.label}
            </span>

            {!isCollapsed && (
              <span className="ml-auto transition-transform duration-300 ease-in-out">
                <ChevronRight 
                  className={[
                    "h-4 w-4 transition-transform duration-300 ease-in-out",
                    isExpanded ? "rotate-90" : "rotate-0"
                  ].join(" ")}
                />
              </span>
            )}
          </div>

          {!isCollapsed && item.description ? (
            <div className="text-xs text-gray-500 transition-opacity duration-500 animate-fade-in text-left">
              {item.description}
            </div>
          ) : null}
        </button>

        {!isCollapsed && item.submenu && (
          <div 
            className={[
              "ml-4 mt-1 space-y-1 overflow-hidden",
              "rounded-lg",
              "transition-all duration-300 ease-in-out origin-top",
              isExpanded 
                ? "max-h-[500px] opacity-100 scale-y-100 py-2" 
                : "max-h-0 opacity-0 scale-y-95 py-0",
              isExpanded && theme === "light"
                ? "border-l-2 border-gray-200 pl-2"
                : isExpanded && theme === "dark"
                ? "border-l-2 border-gray-700 pl-2"
                : "",
            ].join(" ")}
          >
            {item.submenu.map((subItem, subIndex) => {
              // Only exact match for submenu items
              const isSubActive = pathname && subItem.href
                ? pathname === subItem.href
                : false;

              return (
                <Link
                  key={`${subItem.href}-${subIndex}`}
                  href={subItem.href || "#"}
                  style={{ 
                    animationDelay: `${subIndex * 50}ms`,
                    transitionDelay: isExpanded ? `${subIndex * 50}ms` : '0ms'
                  }}
                  className={[
                    "block rounded-lg px-3 py-2 text-sm",
                    "transition-all duration-200",
                    "transform hover:translate-x-1",
                    "hover:scale-[1.02]",
                    isExpanded 
                      ? "translate-x-0 opacity-100" 
                      : "translate-x-[-10px] opacity-0",
                    isSubActive
                      ? theme === "light"
                        ? "bg-gray-100 text-gray-900"
                        : "bg-gray-800 text-gray-100"
                      : theme === "light"
                        ? "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        : "text-gray-300 hover:bg-gray-800 hover:text-gray-100",
                  ].join(" ")}
                  aria-current={isSubActive ? "page" : undefined}
                >
                  <div className="flex items-center gap-2">
                    {subItem.icon ? (
                      <span className="text-base leading-none shrink-0">{subItem.icon}</span>
                    ) : null}
                    <span className="font-medium">{subItem.label}</span>
                  </div>
                  {subItem.description ? (
                    <div className="text-xs text-gray-500 mt-1">
                      {subItem.description}
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      key={`${item.href}-${isCollapsed ? "collapsed" : "expanded"}`}
      href={item.href || "#"}
      title={isCollapsed ? item.label : undefined}
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
            "transition-all duration-500 ease-in-out origin-left",
            isCollapsed
              ? "w-0 scale-90 opacity-0 translate-x-[-10px]"
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
}

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

  // Get all submenu hrefs to check against
  const allSubmenuHrefs = items.flatMap(item => 
    item.submenu ? item.submenu.map(sub => sub.href).filter(Boolean) : []
  ) as string[];

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
          {items.map((item, index) => (
            <MenuItem
              key={`menu-item-${index}`}
              item={item}
              index={index}
              isCollapsed={isCollapsed}
              theme={theme}
              pathname={pathname}
              allSubmenuHrefs={allSubmenuHrefs}
              toggleSidebar={toggleSidebar}
            />
          ))}
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

