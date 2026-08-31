import { getDefaultCopyright } from "@/lib/data/settings-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local get-default-copyright endpoint through the IndexedDB-backed service layer.
 */
export const getDefaultCopyrightRequestPlugin: ZodiosPlugin = {
  name: "local-get-default-copyright",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const data = await getDefaultCopyright();

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
