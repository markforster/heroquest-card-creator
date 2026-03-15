import { libraryImportInputSchema } from "@/api/library";
import { importBackupHqcc, importBackupJson } from "@/lib/backup";

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

export const importLibraryRequestPlugin: ZodiosPlugin = {
  name: "local-import-library",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const parsed = libraryImportInputSchema.parse(config.data ?? {});
      const handlers = (config as LibraryRequestConfig).hqcc;
      const name = parsed.fileName.toLowerCase();
      const file =
        parsed.file instanceof File
          ? parsed.file
          : new File([parsed.file], parsed.fileName, {
              type: parsed.file.type || "application/octet-stream",
            });

      const data = name.endsWith(".hqcc")
        ? await importBackupHqcc(file, {
            onProgress: handlers?.onProgress,
            onStatus: handlers?.onStatus,
            onSecondaryProgress: handlers?.onSecondaryProgress,
          })
        : name.endsWith(".hqcc.json")
          ? await importBackupJson(file, {
              onProgress: handlers?.onProgress,
              onStatus: handlers?.onStatus,
              onSecondaryProgress: handlers?.onSecondaryProgress,
            })
          : await (async () => {
              throw new Error("Unsupported backup file type. Please choose a .hqcc backup file.");
            })();

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
