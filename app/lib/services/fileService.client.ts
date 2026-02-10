"use client";
/**
 * @file fileService.client.ts
 * @description Client-side file service with HTTP operations and React Query hooks for saving, loading, and managing files.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { fileQueryKeys } from "@/app/lib/react-query/queryKeys";
import { HttpClient } from "@/app/lib/services/httpClient";

import type {
  FileDetailsResult,
  LoadFileResult,
  SaveFileParams,
  SaveFileResult,
  UpdateIconResult,
  UploadImageResult,
} from "@/app/lib/services/@types/fileService.client";

export class FileService {
  private httpClient: HttpClient;

  constructor() {
    this.httpClient = new HttpClient();
  }
  /**
   * Save file content to the server
   */
  async saveFile(params: SaveFileParams): Promise<SaveFileResult> {
    const result = await this.httpClient.post<SaveFileResult>("/api/file", params);

    if (!result.success || !result.id) {
      throw new Error(result.error || "Failed to save file");
    }

    return result;
  }

  /**
   * Load file content from the server
   */
  async loadFile(fileId: string): Promise<string> {
    try {
      const result = await this.httpClient.get<LoadFileResult>(
        `/api/file?id=${encodeURIComponent(fileId)}`
      );

      if (!result.success) {
        throw new Error("Failed to load file");
      }

      return result.file?.content ?? "";
    } catch (error) {
      // Return empty string for 404 errors
      if (error instanceof Error && error.message.includes("404")) {
        return "";
      }
      throw error;
    }
  }

  /**
   * Fetch full file details including metadata from the server
   */
  async getFileDetails(fileId: string): Promise<FileDetailsResult["file"]> {
    const result = await this.httpClient.get<FileDetailsResult>(
      `/api/file?id=${encodeURIComponent(fileId)}`
    );

    if (!result.success || !result.file) {
      throw new Error("Failed to fetch file details");
    }

    return result.file;
  }

  /**
   * Update file icon
   */
  async updateFileIcon(fileId: string, icon: string | null): Promise<void> {
    const result = await this.httpClient.post<UpdateIconResult>("/api/file/icon", {
      id: fileId,
      icon,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to update file icon");
    }
  }

  /**
   * Upload an image file to the server
   */
  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const result = await this.httpClient.post<UploadImageResult>(
      "/api/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (!result.success || !result.path) {
      throw new Error(result.error || "Upload failed: No file path returned");
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

