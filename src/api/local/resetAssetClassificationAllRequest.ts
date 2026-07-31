import { clearAssetClassification } from "@/lib/data/assets-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local reset-asset-classification-all endpoint through the IndexedDB-backed service layer.
 */
export const resetAssetClassificationAllRequestPlugin: ZodiosPlugin = {
  name: "local-reset-asset-classification-all",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const count = await clearAssetClassification();

      return {
        data: count,
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
