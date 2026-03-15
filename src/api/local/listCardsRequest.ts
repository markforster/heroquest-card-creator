import { listCardsFilterSchema } from "@/api/cards";
import { listCards } from "@/lib/cards-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { CardRecord } from "@/types/cards-db";

function toListCardsFilter(params?: Record<string, unknown>) {
  const parsed = listCardsFilterSchema.safeParse(params ?? {});
  return parsed.success ? parsed.data : {};
}

function stripCardThumbnail(card: CardRecord): Omit<CardRecord, "thumbnailBlob"> {
  const { thumbnailBlob: _thumbnailBlob, ...rest } = card;
  return rest;
}

export const listCardsRequestPlugin: ZodiosPlugin = {
  name: "local-list-cards",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const data = await listCards(toListCardsFilter(config.queries as Record<string, unknown>));
      const response = data.map(stripCardThumbnail);

      return {
        data: response,
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
