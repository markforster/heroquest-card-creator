import { deckCreateInputSchema } from "@/api/decks";
import { createDeck } from "@/lib/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const createDeckRequestPlugin: ZodiosPlugin = {
  name: "local-create-deck",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const parsed = deckCreateInputSchema.parse(config.data ?? {});
      const data = await createDeck(parsed);
      return {
        data,
        status: 201,
        statusText: "Created",
        headers: { "x-hqcc-source": "indexeddb" },
        config: config as InternalAxiosRequestConfig,
        request: undefined,
      };
    };
    return { ...config, adapter };
  },
};
