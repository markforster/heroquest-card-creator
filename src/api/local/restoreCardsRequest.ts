import { restoreCards } from "@/lib/cards-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const restoreCardsRequestPlugin: ZodiosPlugin = {
  name: "local-restore-cards",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const body = (config.data ?? {}) as { ids?: string[] };
      const ids = Array.isArray(body.ids) ? body.ids : [];
      await restoreCards(ids);

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
