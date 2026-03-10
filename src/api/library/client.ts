"use client";

import { apiClient } from "@/api/client";

import type {
  BackupProgressCallback,
  BackupSecondaryProgressCallback,
  BackupStatusCallback,
} from "@/lib/backup";

type LibraryProgressHandlers = {
  onProgress?: BackupProgressCallback;
  onStatus?: BackupStatusCallback;
  onSecondaryProgress?: BackupSecondaryProgressCallback;
};

type LibraryRequestConfig = {
  hqcc?: LibraryProgressHandlers;
};

type LibraryRequestOptions = {
  hqcc?: LibraryProgressHandlers;
};

function toRequestOptions(options?: LibraryProgressHandlers): LibraryRequestOptions | undefined {
  if (!options) return undefined;
  return { hqcc: options };
}

export async function exportLibrary(options?: LibraryProgressHandlers) {
  const requestOptions = toRequestOptions(options);
  return requestOptions
    ? apiClient.exportLibrary(requestOptions as any)
    : apiClient.exportLibrary();
}

export async function importLibrary(file: File, options?: LibraryProgressHandlers) {
  return apiClient.importLibrary(
    { file, fileName: file.name },
    toRequestOptions(options) as any,
  );
}
