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
      const file =
        parsed.file instanceof File
          ? parsed.file
          : new File([parsed.file], parsed.fileName, {
              type: parsed.file.type || "application/octet-stream",
            });

      const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
      const isZip =
        header.length >= 4 &&
        header[0] === 0x50 &&
        header[1] === 0x4b &&
        ((header[2] === 0x03 && header[3] === 0x04) ||
          (header[2] === 0x05 && header[3] === 0x06) ||
          (header[2] === 0x07 && header[3] === 0x08));

      const data = isZip
        ? await importBackupHqcc(file, {
            onProgress: handlers?.onProgress,
            onStatus: handlers?.onStatus,
            onSecondaryProgress: handlers?.onSecondaryProgress,
          })
        : await importBackupJson(file, {
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
