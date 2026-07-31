"use client";

import { apiClient } from "@/api/client";
import type { BackupContainerFormat } from "@/lib/backup-formats";

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

export async function exportLibrary(
  options?: LibraryProgressHandlers & { format?: BackupContainerFormat },
) {
  const requestOptions = toRequestOptions(options);
  const request = options?.format ? { queries: { format: options.format } } : undefined;

  if (request && requestOptions) {
    return apiClient.exportLibrary(request as any, requestOptions as any);
  }
  if (request) {
    return apiClient.exportLibrary(request as any);
  }
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
