import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { ZodiosPlugin } from "@zodios/core";

import { normalizeSelfPairings } from "@/lib/data/cards-db";

/**
 * Serves the local normalize-self-pairings endpoint through the IndexedDB-backed service layer.
 */
export const normalizeSelfPairingsRequestPlugin: ZodiosPlugin = {
  name: "local-normalize-self-pairings",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const data = await normalizeSelfPairings();

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
