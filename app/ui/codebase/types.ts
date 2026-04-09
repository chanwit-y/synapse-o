export type SortField = "name" | "createdAt" | "updatedAt";
export type SortDir = "asc" | "desc";

/** IANA timezone for display (Thailand, UTC+7, no DST). */
const DISPLAY_TIMEZONE = "Asia/Bangkok";

/**
 * Format a stored timestamp for display. Accepts Unix seconds, Unix ms, ISO strings,
 * or SQLite-style strings; returns "-" when missing or unparseable.
 * Shown in Asia/Bangkok as MMM D, YYYY HH:mm (24h).
 */
export function formatDate(ts: number | string | null | undefined): string {
  if (ts == null || ts === "") return "-";

  let ms: number;
  if (typeof ts === "string") {
    const trimmed = ts.trim();
    if (!trimmed) return "-";
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      ms = parsed;
    } else {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) return "-";
      ms = n > 1e12 ? n : n * 1000;
    }
  } else {
    if (!Number.isFinite(ts)) return "-";
    // Heuristic: values > 1e12 are treated as milliseconds (e.g. Date.now()).
    ms = ts > 1e12 ? ts : ts * 1000;
  }

  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "-";

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const pad2 = (s: string) => s.padStart(2, "0");
  const month = pick("month");
  const day = pick("day");
  const year = pick("year");
  const hour = pad2(pick("hour"));
  const minute = pad2(pick("minute"));
  return `${month} ${day}, ${year} ${hour}:${minute}`;
}

export function getThemeStyles(isDark: boolean) {
  return {
    cardBg: isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200",
    cardHover: isDark ? "hover:border-gray-600 hover:bg-gray-800/60" : "hover:border-gray-300 hover:bg-gray-50",
    mutedText: isDark ? "text-gray-400" : "text-gray-500",
    pillBg: isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600",
    inputBg: isDark
      ? "border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
      : "border-gray-300 bg-white text-gray-900 placeholder-gray-400",
    sortBtnBase: isDark
      ? "text-gray-300 hover:bg-gray-800"
      : "text-gray-600 hover:bg-gray-100",
    sortBtnActive: isDark ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-900",
  };
}
