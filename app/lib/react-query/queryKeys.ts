"use client";
/**
 * @file queryKeys.ts
 * @description Defines React Query key factory for file-related queries (content, details, by ID).
 */

export const fileQueryKeys = {
  all: ["file"] as const,
  byId: (id: string) => ["file", id] as const,
  content: (id: string) => ["file", id, "content"] as const,
  details: (id: string) => ["file", id, "details"] as const,
};

