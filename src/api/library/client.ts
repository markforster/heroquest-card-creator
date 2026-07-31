"use client";

import { apiClient } from "@/api/client";
import type {
  BackupProgressCallback,
  BackupSecondaryProgressCallback,
  BackupStatusCallback,
} from "@/lib/backup";
import type { BackupContainerFormat } from "@/lib/backup-formats";

type LibraryProgressHandlers = {
  onProgress?: BackupProgressCallback;
  onStatus?: BackupStatusCallback;
  onSecondaryStatus?: (mode: "worker" | "fallback") => void;
  onSecondaryProgress?: BackupSecondaryProgressCallback;
};

type LibraryRequestOptions = {
  hqcc?: LibraryProgressHandlers;
};

type ExportLibraryRequestOptions = NonNullable<Parameters<typeof apiClient.exportLibrary>[0]> &
  LibraryRequestOptions;

type ImportLibraryRequestOptions = NonNullable<Parameters<typeof apiClient.importLibrary>[1]> &
  LibraryRequestOptions;

function toRequestOptions(options?: LibraryProgressHandlers): LibraryRequestOptions | undefined {
  if (!options) return undefined;
  return { hqcc: options };
}

export async function exportLibrary(
  options?: LibraryProgressHandlers & { format?: BackupContainerFormat },
) {
  const requestOptions = toRequestOptions(options);
  if (options?.format || requestOptions) {
    const request: ExportLibraryRequestOptions = {
      ...(options?.format ? { queries: { format: options.format } } : {}),
      ...requestOptions,
    };
    return apiClient.exportLibrary(request);
  }
  return apiClient.exportLibrary();
}

export async function importLibrary(file: File, options?: LibraryProgressHandlers) {
  const requestOptions: ImportLibraryRequestOptions | undefined = toRequestOptions(options);
  return apiClient.importLibrary({ file, fileName: file.name }, requestOptions);
}
