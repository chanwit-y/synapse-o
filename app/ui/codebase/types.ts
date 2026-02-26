export type SortField = "name" | "createdAt" | "updatedAt";
export type SortDir = "asc" | "desc";

export function formatDate(ts: number | null | undefined): string {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
