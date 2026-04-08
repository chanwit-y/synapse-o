"use client";
/**
 * @file Drawer.tsx
 * @description A sliding drawer/panel component that can open from left/right/top/bottom with customizable title, size, and dismissal options.
 */

import { ReactNode, useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import "./Drawer.css";

type DrawerPosition = "left" | "right" | "top" | "bottom";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  position?: DrawerPosition;
  size?: number | string;
  title?: string;
  closable?: boolean;
  dismissible?: boolean;
  className?: string;
}

const positionClasses: Record<DrawerPosition, string> = {
  left: "left-0 top-0 h-full",
  right: "right-0 top-0 h-full",
  top: "left-0 top-0 w-full",
  bottom: "left-0 bottom-0 w-full",
};

export default function Drawer({
  open,
  onClose,
  children,
  position = "right",
  size,
  title,
  closable = true,
  dismissible = true,
  className,
}: DrawerProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [isRendered, setIsRendered] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setIsRendered(true);
      setIsClosing(false);
      return;
    }

    if (isRendered) {
      setIsClosing(true);
    }
  }, [open, isRendered]);

  if (!isRendered) return null;

  const isHorizontal = position === "left" || position === "right";
  const panelStyle: React.CSSProperties = isHorizontal
    ? { width: size ?? "24rem" }
    : { height: size ?? "16rem" };

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={dismissible ? onClose : undefined}
      role="presentation"
    >
      <div
        className={[
          "absolute inset-0 backdrop-blur-sm drawer-backdrop",
          isDark ? "bg-black/50" : "bg-black/20",
          isClosing ? "drawer-backdrop-closing" : "",
        ].join(" ")}
      />
      <div
        className={[
          "absolute border shadow-xl drawer-panel",
          `drawer-panel-${position}`,
          isClosing ? "drawer-panel-closing" : "",
          positionClasses[position],
          isDark
            ? "bg-gray-800 text-gray-100 border-gray-700"
            : "bg-white text-gray-900 border-gray-200",
          className ?? "",
        ].join(" ")}
        style={panelStyle}
        onClick={(event) => event.stopPropagation()}
        onAnimationEnd={() => {
          if (!open && isClosing) {
            setIsRendered(false);
            setIsClosing(false);
          }
        }}
        role="dialog"
        aria-modal="true"
      >
        {(title || closable) && (
          <div
            className={[
              "flex items-center justify-between border-b px-4 py-3",
              isDark ? "border-gray-700" : "border-gray-200",
            ].join(" ")}
          >
            <div className="text-sm font-semibold">{title}</div>
            {closable ? (
              <button
                type="button"
                onClick={onClose}
                className={`rounded-md p-1 transition-colors ${
                  isDark
                    ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                    : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                }`}
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        )}
        <div className="h-[calc(100%-3.5rem)] overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

