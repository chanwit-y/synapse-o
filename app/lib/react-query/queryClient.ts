"use client";
/**
 * @file queryClient.ts
 * @description Configured React Query client with default options for staleTime, retry behavior, and refetch settings.
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
    mutations: {
      retry: 0,
    },
  },
});

