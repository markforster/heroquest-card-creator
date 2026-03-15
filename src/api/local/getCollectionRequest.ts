import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { ZodiosPlugin } from "@zodios/core";

import { getCollection } from "@/lib/collections-db";

export const getCollectionRequestPlugin: ZodiosPlugin = {
  name: "local-get-collection",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const params = (config.params ?? {}) as Record<string, unknown>;
      const id = typeof params.id === "string" ? params.id : null;
      if (!id) {
        throw new Error("[api:getCollection] Missing id param");
      }
      const data = await getCollection(id);

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
