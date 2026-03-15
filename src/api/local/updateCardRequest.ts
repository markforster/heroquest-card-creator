import { cardUpdateInputSchema } from "@/api/cards";
import { updateCard } from "@/lib/cards-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const updateCardRequestPlugin: ZodiosPlugin = {
  name: "local-update-card",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const params = (config.params ?? {}) as Record<string, unknown>;
      const id = typeof params.id === "string" ? params.id : null;
      if (!id) {
        throw new Error("[api:updateCard] Missing id param");
      }

      const patch = cardUpdateInputSchema.parse(config.data ?? {});
      const data = await updateCard(id, patch);

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
