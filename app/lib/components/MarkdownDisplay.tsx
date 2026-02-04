"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";

type ChunkAnimationOptions = {
  enabled?: boolean;
  intervalMs?: number;
  chunkSize?: number;
};

type AutoScrollOptions = {
  enabled?: boolean;
  behavior?: ScrollBehavior;
};

function useChunkedReveal(text: string, opts: ChunkAnimationOptions) {
  const enabled = opts.enabled ?? true;
  const intervalMs = opts.intervalMs ?? 12;
  const chunkSize = opts.chunkSize ?? 6;

  const [visibleText, setVisibleText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setVisibleText(text ?? "");
      setIsAnimating(false);
      return;
    }

    const full = text ?? "";
    if (!full) {
      setVisibleText("");
      setIsAnimating(false);
      return;
    }

    setVisibleText("");
    setIsAnimating(true);

    let i = 0;
    const timer = window.setInterval(() => {
      i += chunkSize;
      if (i >= full.length) {
        setVisibleText(full);
        setIsAnimating(false);
        window.clearInterval(timer);
        return;
      }
      setVisibleText(full.slice(0, i));
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [chunkSize, enabled, intervalMs, text]);

  return { visibleText, isAnimating };
}

export default function MarkdownDisplay(props: {
  content: string;
  theme?: "light" | "dark";
  className?: string;
  animate?: ChunkAnimationOptions;
  autoScroll?: AutoScrollOptions;
}) {
  const { content, theme, className, animate, autoScroll } = props;
  const { visibleText, isAnimating } = useChunkedReveal(content, animate ?? {});
  const autoScrollEnabled = autoScroll?.enabled ?? false;
  const autoScrollBehavior: ScrollBehavior = autoScroll?.behavior ?? "auto";
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!autoScrollEnabled) return;
    if (!isAnimating) return;

    // During the typing animation, keep the latest content in view by scrolling
    // a sentinel element into view. This scrolls the nearest scrollable ancestor
    // (e.g. the modal body).
    if (rafIdRef.current != null) window.cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: "end", behavior: autoScrollBehavior });
    });

    return () => {
      if (rafIdRef.current != null) window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    };
  }, [autoScrollBehavior, autoScrollEnabled, isAnimating, visibleText]);

  const components = useMemo(() => {
    const isDark = theme === "dark";
    const text = isDark ? "text-gray-100" : "text-gray-900";
    const muted = isDark ? "text-gray-300" : "text-gray-600";
    const border = isDark ? "border-gray-700" : "border-gray-200";
    const codeBg = isDark ? "bg-black/30" : "bg-gray-100";
    const preBg = isDark ? "bg-black/40" : "bg-gray-50";
    const link = isDark ? "text-blue-300" : "text-blue-700";

    return {
      h1: (p: any) => <h1 className={`text-xl font-semibold ${text} mt-4 mb-2`} {...p} />,
      h2: (p: any) => <h2 className={`text-lg font-semibold ${text} mt-4 mb-2`} {...p} />,
      h3: (p: any) => <h3 className={`text-base font-semibold ${text} mt-3 mb-1.5`} {...p} />,
      p: (p: any) => <p className={`${muted} text-sm leading-6 my-2`} {...p} />,
      a: (p: any) => (
        <a
          className={`${link} underline underline-offset-2 hover:opacity-90`}
          target="_blank"
          rel="noreferrer"
          {...p}
        />
      ),
      ul: (p: any) => <ul className={`${muted} text-sm leading-6 my-2 pl-5 list-disc`} {...p} />,
      ol: (p: any) => <ol className={`${muted} text-sm leading-6 my-2 pl-5 list-decimal`} {...p} />,
      li: (p: any) => <li className="my-1" {...p} />,
      blockquote: (p: any) => (
        <blockquote className={`my-3 pl-3 border-l-2 ${border} ${muted}`} {...p} />
      ),
      hr: (p: any) => <hr className={`my-4 ${border}`} {...p} />,
      code: ({ inline, className: cn, ...p }: any) => {
        if (inline) {
          return (
            <code
              className={`px-1 py-0.5 rounded ${codeBg} ${text} text-[0.85em]`}
              {...p}
            />
          );
        }
        return <code className={`${cn ?? ""} text-[0.85em]`} {...p} />;
      },
      pre: (p: any) => (
        <pre
          className={`my-3 p-3 rounded-md overflow-auto ${preBg} ${text} text-sm`}
          {...p}
        />
      ),
      table: (p: any) => (
        <div className="my-3 overflow-auto">
          <table className={`min-w-full text-sm ${border}`} {...p} />
        </div>
      ),
      thead: (p: any) => <thead className={isDark ? "bg-gray-900/40" : "bg-gray-50"} {...p} />,
      th: (p: any) => <th className={`text-left p-2 border ${border}`} {...p} />,
      td: (p: any) => <td className={`p-2 border ${border}`} {...p} />,
    };
  }, [theme]);

  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={components as any}
      >
        {visibleText}
      </ReactMarkdown>
      <div ref={bottomRef} />
      {isAnimating && (
        <span
          aria-hidden="true"
          className={[
            "inline-block align-baseline ml-1 w-2 h-4 rounded-sm",
            theme === "dark" ? "bg-gray-300" : "bg-gray-700",
            "animate-pulse",
          ].join(" ")}
        />
      )}
    </div>
  );
}


