import { getCard } from "@/lib/cards-db";
import type { CardRecord } from "@/types/cards-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const getCardRequestPlugin: ZodiosPlugin = {
  name: "local-get-card",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const params = (config.params ?? {}) as Record<string, unknown>;
      const id = typeof params.id === "string" ? params.id : null;
      if (!id) {
        throw new Error("[api:getCard] Missing id param");
      }
      const record = await getCard(id);
      const data = record
        ? (() => {
            const { thumbnailBlob: _thumbnailBlob, ...rest } = record as CardRecord;
            return rest;
          })()
        : null;

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
