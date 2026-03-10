import { softDeleteCards } from "@/lib/cards-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const softDeleteCardsRequestPlugin: ZodiosPlugin = {
  name: "local-soft-delete-cards",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const body = (config.data ?? {}) as { ids?: string[]; deletedAt?: number };
      const ids = Array.isArray(body.ids) ? body.ids : [];
      await softDeleteCards(ids, body.deletedAt);

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
