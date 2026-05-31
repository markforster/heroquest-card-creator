import { duplicateDeck } from "@/lib/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const duplicateDeckRequestPlugin: ZodiosPlugin = {
  name: "local-duplicate-deck",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const deckId = (config.params ?? {}).deckId as string | undefined;
      if (!deckId) {
        throw new Error("[api:duplicateDeck] Missing deckId");
      }
      const data = await duplicateDeck(deckId);
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
