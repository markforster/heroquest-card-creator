import { cardCreateInputSchema } from "@/api/cards";
import { createCard } from "@/lib/data/cards-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local create-card endpoint through the IndexedDB-backed service layer.
 */
export const createCardRequestPlugin: ZodiosPlugin = {
  name: "local-create-card",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const parsed = cardCreateInputSchema.parse(config.data ?? {});
      const data = await createCard(parsed);

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
