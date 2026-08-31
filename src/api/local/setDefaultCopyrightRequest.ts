import { setDefaultCopyright } from "@/lib/data/settings-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local set-default-copyright endpoint through the IndexedDB-backed service layer.
 */
export const setDefaultCopyrightRequestPlugin: ZodiosPlugin = {
  name: "local-set-default-copyright",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const body = (config.data ?? {}) as { value?: string };
      await setDefaultCopyright(body.value ?? "");

      return {
        data: undefined,
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
