"use client";
/**
 * @file Modal.tsx
 * @description A centered modal dialog component with backdrop, animations, close button, and configurable sizing.
 */

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2, X } from "lucide-react";
import { useTheme } from "./ThemeProvider";

type ModalSize = "sm" | "md" | "lg" | "xl";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: ModalSize;
  fullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

export default function Modal({ isOpen, onClose, children, size = "sm", fullScreen = false, onToggleFullScreen }: ModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);
  const prevHeightRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  const measureHeight = useCallback(() => {
    if (!contentRef.current || fullScreen) return;
    const h = contentRef.current.scrollHeight;
    if (h !== prevHeightRef.current) {
      prevHeightRef.current = h;
      setContentHeight(h);
    }
  }, [fullScreen]);

  useEffect(() => {
    if (!isOpen || !mounted || fullScreen) return;
    const el = contentRef.current;
    if (!el) return;

    measureHeight();

    const ro = new ResizeObserver(measureHeight);
    ro.observe(el);

    const mo = new MutationObserver(measureHeight);
    mo.observe(el, { childList: true, subtree: true, attributes: true });

    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [isOpen, mounted, fullScreen, measureHeight]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop with blur */}
      <div
        className={`absolute inset-0 backdrop-blur-sm transition-opacity duration-300 ${
          isAnimating ? "opacity-100" : "opacity-0"
        } ${isDark ? "bg-black/50" : "bg-black/20"}`}
      />

      {/* Modal content */}
      <div
        className={`relative shadow-xl border w-full overflow-hidden transition-[opacity,transform,height] duration-300 ease-in-out ${
          fullScreen
            ? "h-full mx-0 rounded-none"
            : `${sizeClasses[size]} mx-4 rounded-lg`
        } ${
          isAnimating
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95"
        } ${
          isDark
            ? "bg-gray-800 text-gray-100 border-gray-700"
            : "bg-white text-gray-900 border-gray-200"
        }`}
        style={
          !fullScreen && contentHeight !== undefined
            ? { height: contentHeight }
            : undefined
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={contentRef} className="p-6">
          <div className="absolute top-4 right-4 flex items-center gap-1 z-10">
            {onToggleFullScreen && (
              <button
                onClick={onToggleFullScreen}
                className={`p-1 rounded-md transition-colors ${
                  isDark
                    ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                    : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                }`}
                aria-label={fullScreen ? "Exit full screen" : "Full screen"}
              >
                {fullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-1 rounded-md transition-colors ${
                isDark
                  ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                  : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

