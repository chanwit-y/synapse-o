"use client";
/**
 * @file ReactQueryProvider.tsx
 * @description React component providing QueryClientProvider wrapper for React Query integration.
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/app/lib/react-query/queryClient";

export function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

