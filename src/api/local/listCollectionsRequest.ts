import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { ZodiosPlugin } from "@zodios/core";

import { listCollections } from "@/lib/data/collections-db";

/**
 * Serves the local list-collections endpoint through the IndexedDB-backed service layer.
 */
export const listCollectionsRequestPlugin: ZodiosPlugin = {
  name: "local-list-collections",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const data = await listCollections();

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
