import { getAllAssetsWithBlobs } from "@/lib/assets-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local list-assets-with-blobs endpoint through the IndexedDB-backed service layer.
 */
export const listAssetsWithBlobsRequestPlugin: ZodiosPlugin = {
  name: "local-list-assets-with-blobs",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const data = await getAllAssetsWithBlobs();

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
