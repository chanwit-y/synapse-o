"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { fileQueryKeys } from "@/app/lib/react-query/queryKeys";

import type {
  FileDetailsResult,
  LoadFileResult,
  SaveFileParams,
  SaveFileResult,
  UpdateIconResult,
  UploadImageResult,
} from "@/app/lib/services/@types/fileService.client";

export class FileService {
  /**
   * Save file content to the server
   */
  async saveFile(params: SaveFileParams): Promise<SaveFileResult> {
    const response = await fetch("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const result = (await response.json()) as SaveFileResult;

    if (!response.ok || !result.success || !result.id) {
      throw new Error(result.error || "Failed to save file");
    }

    return result;
  }

  /**
   * Load file content from the server
   */
  async loadFile(fileId: string): Promise<string> {
    const response = await fetch(`/api/file?id=${encodeURIComponent(fileId)}`);

    if (!response.ok) {
      if (response.status === 404) {
        return "";
      }
      const errorBody = (await response.json()) as { error?: string };
      throw new Error(errorBody.error || "Failed to load file");
    }

    const result = (await response.json()) as LoadFileResult;
    if (!result.success) {
      throw new Error("Failed to load file");
    }

    return result.file?.content ?? "";
  }

  /**
   * Fetch full file details including metadata from the server
   */
  async getFileDetails(fileId: string): Promise<FileDetailsResult["file"]> {
    const response = await fetch(`/api/file?id=${encodeURIComponent(fileId)}`);

    if (!response.ok) {
      throw new Error("Failed to fetch file");
    }

    const result = (await response.json()) as FileDetailsResult;

    if (!result.success || !result.file) {
      throw new Error("Failed to fetch file details");
    }

    return result.file;
  }

  /**
   * Update file icon
   */
  async updateFileIcon(fileId: string, icon: string | null): Promise<void> {
    const response = await fetch("/api/file/icon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: fileId, icon }),
    });

    if (!response.ok) {
      const result = (await response.json()) as UpdateIconResult;
      throw new Error(result.error || "Failed to update file icon");
    }
  }

  /**
   * Upload an image file to the server
   */
  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const result = (await response.json()) as UploadImageResult;

    if (!response.ok) {
      throw new Error(result.error || "Failed to upload file");
    }

    if (!result.success || !result.path) {
      throw new Error("Upload failed: No file path returned");
    }

    return result.path;
  }
}

// Export a singleton instance
export const fileService = new FileService();

type EnabledQueryOptions<TQueryFnData> = Omit<
  UseQueryOptions<TQueryFnData, Error, TQueryFnData, readonly unknown[]>,
  "queryKey" | "queryFn"
>;

/**
 * React Query hook: load file content (string).
 * Uses the same underlying fetcher as `fileService.loadFile`.
 */
export function useFileContentQuery(
  fileId: string | null | undefined,
  options: EnabledQueryOptions<string> = {},
) {
  const enabled = Boolean(fileId) && (options.enabled ?? true);
  const stableId = fileId ?? "__no-file__";

  return useQuery({
    ...options,
    enabled,
    queryKey: fileQueryKeys.content(stableId),
    queryFn: () => fileService.loadFile(fileId as string),
  });
}

/**
 * React Query hook: fetch full file details (metadata + optional content).
 */
export function useFileDetailsQuery(
  fileId: string | null | undefined,
  options: EnabledQueryOptions<FileDetailsResult["file"]> = {},
) {
  const enabled = Boolean(fileId) && (options.enabled ?? true);
  const stableId = fileId ?? "__no-file__";

  return useQuery({
    ...options,
    enabled,
    queryKey: fileQueryKeys.details(stableId),
    queryFn: () => fileService.getFileDetails(fileId as string),
  });
}

/**
 * React Query hook: save file content.
 * Invalidates all cached queries for that file id.
 */
export function useSaveFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SaveFileParams) => fileService.saveFile(params),
    onSuccess: (result) => {
      if (result.id) {
        void queryClient.invalidateQueries({ queryKey: fileQueryKeys.byId(result.id) });
      }
      void queryClient.invalidateQueries({ queryKey: fileQueryKeys.all });
    },
  });
}

/**
 * React Query hook: update icon for a file.
 * Invalidates cached metadata/details for that file id.
 */
export function useUpdateFileIconMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { fileId: string; icon: string | null }) =>
      fileService.updateFileIcon(vars.fileId, vars.icon),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: fileQueryKeys.byId(vars.fileId) });
    },
  });
}

/**
 * React Query hook: upload image (returns public path string).
 */
export function useUploadImageMutation() {
  return useMutation({
    mutationFn: (file: File) => fileService.uploadImage(file),
  });
}

