import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { ZodiosPlugin } from "@zodios/core";

import { collectionCreateInputSchema } from "@/api/collections";
import { createCollection } from "@/lib/collections-db";

export const createCollectionRequestPlugin: ZodiosPlugin = {
  name: "local-create-collection",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const parsed = collectionCreateInputSchema.parse(config.data ?? {});
      const data = await createCollection(parsed);

      return {
        data,
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
