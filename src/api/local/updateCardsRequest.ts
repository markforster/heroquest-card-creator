import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { ZodiosPlugin } from "@zodios/core";

import { updateCardsInputSchema } from "@/api/cards";
import { updateCards } from "@/lib/cards-db";

export const updateCardsRequestPlugin: ZodiosPlugin = {
  name: "local-update-cards",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const parsed = updateCardsInputSchema.parse(config.data ?? {});
      await updateCards(parsed.ids, parsed.patch);

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
