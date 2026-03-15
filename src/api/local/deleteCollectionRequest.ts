import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { ZodiosPlugin } from "@zodios/core";

import { deleteCollection } from "@/lib/collections-db";

export const deleteCollectionRequestPlugin: ZodiosPlugin = {
  name: "local-delete-collection",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const params = (config.params ?? {}) as Record<string, unknown>;
      const id = typeof params.id === "string" ? params.id : null;
      if (!id) {
        throw new Error("[api:deleteCollection] Missing id param");
      }
      await deleteCollection(id);

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
