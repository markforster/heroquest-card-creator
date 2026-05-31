import { deleteCardsInputSchema } from "@/api/cards";
import { deleteCardsWithCascade } from "@/lib/cards-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const deleteCardsRequestPlugin: ZodiosPlugin = {
  name: "local-delete-cards",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const parsed = deleteCardsInputSchema.parse(config.data ?? {});
      await deleteCardsWithCascade(parsed.ids, {
        mode: parsed.mode,
        confirmCascade: parsed.confirmCascade,
      });

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
