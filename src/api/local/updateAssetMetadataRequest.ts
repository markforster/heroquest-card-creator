import { updateAssetMeta } from "@/lib/assets-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const updateAssetMetadataRequestPlugin: ZodiosPlugin = {
  name: "local-update-asset-metadata",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const params = (config.params ?? {}) as Record<string, unknown>;
      const id = typeof params.id === "string" ? params.id : null;
      if (!id) {
        throw new Error("[api:updateAssetMetadata] Missing id param");
      }
      const body = (config.data ?? {}) as { patch?: Record<string, unknown> };
      const patch = (body.patch ?? {}) as Record<string, unknown>;
      await updateAssetMeta(id, patch as never);

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
