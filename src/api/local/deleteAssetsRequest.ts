import { deleteAssetsInputSchema } from "@/api/assets";
import { deleteAssets } from "@/lib/data/assets-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local delete-assets endpoint through the IndexedDB-backed service layer.
 */
export const deleteAssetsRequestPlugin: ZodiosPlugin = {
  name: "local-delete-assets",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const parsed = deleteAssetsInputSchema.parse(config.data ?? {});
      await deleteAssets(parsed.ids);

      return {
        data: undefined,
        status: 204,
        statusText: "No Content",
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
