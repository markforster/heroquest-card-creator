import { addAssetInputSchema } from "@/api/assets";
import { addAsset } from "@/lib/data/assets-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local add-asset endpoint through the IndexedDB-backed service layer.
 */
export const addAssetRequestPlugin: ZodiosPlugin = {
  name: "local-add-asset",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const parsed = addAssetInputSchema.parse(config.data ?? {});
      const { id, blob, ...meta } = parsed;
      await addAsset(id, blob, meta);

      return {
        data: undefined,
        status: 201,
        statusText: "Created",
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
