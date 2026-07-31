import { createBackupHqcc } from "@/lib/backup";
import { normalizeBackupFormat } from "@/lib/backup-formats";

import type {
  BackupProgressCallback,
  BackupSecondaryProgressCallback,
  BackupStatusCallback,
} from "@/lib/backup";
import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

type LibraryProgressHandlers = {
  onProgress?: BackupProgressCallback;
  onStatus?: BackupStatusCallback;
  onSecondaryStatus?: (mode: "worker" | "fallback") => void;
  onSecondaryProgress?: BackupSecondaryProgressCallback;
};

type LibraryRequestConfig = {
  hqcc?: LibraryProgressHandlers;
};

/**
 * Runs the local library export flow and forwards progress handlers to the backup service.
 */
export const exportLibraryRequestPlugin: ZodiosPlugin = {
  name: "local-export-library",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const handlers = (config as LibraryRequestConfig).hqcc;
      const queries = (config.queries ?? {}) as Record<string, unknown>;
      const format =
        typeof queries.format === "string" ? normalizeBackupFormat(queries.format) : null;
      const data = await createBackupHqcc({
        format: format ?? undefined,
        onProgress: handlers?.onProgress,
        onStatus: handlers?.onStatus,
        onSecondaryStatus: handlers?.onSecondaryStatus,
        onSecondaryProgress: handlers?.onSecondaryProgress,
      });

      return {
        data,
        status: 200,
        statusText: "OK",
        headers: {
          "x-hqcc-source": "indexeddb",
        },
        config: config as InternalAxiosRequestConfig,
        request: undefined,
      };
    };

    return {
      ...config,
      adapter,
    };
  },
};
