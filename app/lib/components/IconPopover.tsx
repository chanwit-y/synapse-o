"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type IconOption = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

type IconPopoverProps = {
  value: string;
  options: IconOption[];
  onChange: (id: string) => void;
  ariaLabel?: string;
};

export default function IconPopover({
  value,
  options,
  onChange,
  ariaLabel = "Change icon",
}: IconPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = useMemo(
    () => options.find((option) => option.id === value) ?? options[0],
    [options, value],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!selectedOption) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        className="flex items-center gap-1 rounded-md p-1.5 text-gray-300 transition-colors hover:bg-gray-600/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={ariaLabel}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {selectedOption.icon}
        {/* <svg
          className="h-3.5 w-3.5 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.13l3.71-3.9a.75.75 0 1 1 1.08 1.04l-4.25 4.46a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg> */}
      </button>

      {isOpen ? (
        <div
          className="absolute left-0 z-20 mt-2 w-80 rounded-lg border border-gray-700 bg-gray-900/95 p-2 shadow-lg"
          role="menu"
        >
          <div className="max-h-72 overflow-y-auto pr-1">
            <div className="grid grid-cols-6 gap-2">
            {options.map((option) => {
              const isSelected = option.id === selectedOption.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                  }}
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                    isSelected
                      ? "bg-sky-500/20 text-sky-200"
                      : "text-gray-300 hover:bg-gray-600",
                  ].join(" ")}
                  aria-pressed={isSelected}
                  title={option.label}
                >
                  <>
                    {option.icon}
                    <span className="sr-only">{option.label}</span>
                  </>
                </button>
              );
            })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

