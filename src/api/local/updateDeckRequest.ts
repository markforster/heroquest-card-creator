import { deckUpdateInputSchema } from "@/api/decks";
import { updateDeck } from "@/lib/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const updateDeckRequestPlugin: ZodiosPlugin = {
  name: "local-update-deck",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const deckId = (config.params ?? {}).deckId as string | undefined;
      if (!deckId) {
        throw new Error("[api:updateDeck] Missing deckId");
      }
      const parsed = deckUpdateInputSchema.parse(config.data ?? {});
      const data = await updateDeck(deckId, parsed);
      return {
        data,
        status: 200,
        statusText: "OK",
        headers: { "x-hqcc-source": "indexeddb" },
        config: config as InternalAxiosRequestConfig,
        request: undefined,
      };
    };
    return { ...config, adapter };
  },
};
