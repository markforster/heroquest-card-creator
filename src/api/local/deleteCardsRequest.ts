import { deleteCardsInputSchema } from "@/api/cards";
import { deleteCards } from "@/lib/cards-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const deleteCardsRequestPlugin: ZodiosPlugin = {
  name: "local-delete-cards",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const parsed = deleteCardsInputSchema.parse(config.data ?? {});
      await deleteCards(parsed.ids);

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
