import {
  probeHqccDbVersion,
  readExistingHqccDbAppVersion,
  readExistingHqccDbVersion,
} from "@/lib/hqcc-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

function isVersionError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name?: string }).name === "VersionError",
  );
}

export const checkDbVersionRequestPlugin: ZodiosPlugin = {
  name: "local-check-db-version",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      try {
        const version = await probeHqccDbVersion();

        return {
          data: {
            status: "ready",
            dbVersion: version,
            dbAppVersion: null,
          },
          status: 200,
          statusText: "OK",
          headers: {
            "x-hqcc-source": "indexeddb",
          },
          config: config as InternalAxiosRequestConfig,
          request: undefined,
        };
      } catch (error) {
        if (!isVersionError(error)) {
          throw error;
        }

        const [version, appVersion] = await Promise.all([
          readExistingHqccDbVersion(),
          readExistingHqccDbAppVersion(),
        ]);

        return {
          data: {
            status: "blocked",
            dbVersion: version,
            dbAppVersion: appVersion,
          },
          status: 200,
          statusText: "OK",
          headers: {
            "x-hqcc-source": "indexeddb",
          },
          config: config as InternalAxiosRequestConfig,
          request: undefined,
        };
      }
    };

    return {
      ...config,
      adapter,
    };
  },
};
