import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { ZodiosPlugin } from "@zodios/core";

import { collectionUpdateInputSchema } from "@/api/collections";
import { updateCollection } from "@/lib/collections-db";

export const updateCollectionRequestPlugin: ZodiosPlugin = {
  name: "local-update-collection",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const params = (config.params ?? {}) as Record<string, unknown>;
      const id = typeof params.id === "string" ? params.id : null;
      if (!id) {
        throw new Error("[api:updateCollection] Missing id param");
      }
      const patch = collectionUpdateInputSchema.parse(config.data ?? {});
      const data = await updateCollection(id, patch);

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
