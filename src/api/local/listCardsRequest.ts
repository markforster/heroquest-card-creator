import { listCardsFilterSchema } from "@/api/cards";
import { listCards } from "@/lib/cards-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

function toListCardsFilter(params?: Record<string, unknown>) {
  const parsed = listCardsFilterSchema.safeParse(params ?? {});
  return parsed.success ? parsed.data : {};
}

export const listCardsRequestPlugin: ZodiosPlugin = {
  name: "local-list-cards",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const data = await listCards(toListCardsFilter(config.queries as Record<string, unknown>));

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
