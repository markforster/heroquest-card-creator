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

function toRequestOptions(options?: LibraryProgressHandlers): LibraryRequestOptions | undefined {
  if (!options) return undefined;
  return { hqcc: options };
}

export async function exportLibrary(
  options?: LibraryProgressHandlers & { format?: BackupContainerFormat },
) {
  const requestOptions = toRequestOptions(options);
  if (options?.format || requestOptions) {
    return apiClient.exportLibrary({
      ...(options?.format ? { queries: { format: options.format } } : {}),
      ...requestOptions,
    } as any);
  }
  return apiClient.exportLibrary();
}

export async function importLibrary(file: File, options?: LibraryProgressHandlers) {
  return apiClient.importLibrary({ file, fileName: file.name }, toRequestOptions(options) as any);
}
