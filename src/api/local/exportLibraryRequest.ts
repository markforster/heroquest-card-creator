import { createBackupHqcc } from "@/lib/backup";

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
  onSecondaryProgress?: BackupSecondaryProgressCallback;
};

type LibraryRequestConfig = {
  hqcc?: LibraryProgressHandlers;
};

export const exportLibraryRequestPlugin: ZodiosPlugin = {
  name: "local-export-library",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const handlers = (config as LibraryRequestConfig).hqcc;
      const data = await createBackupHqcc({
        onProgress: handlers?.onProgress,
        onStatus: handlers?.onStatus,
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
