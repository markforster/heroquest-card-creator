import { listCardDeckMembership } from "@/lib/data/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local list-card-decks endpoint through the IndexedDB-backed service layer.
 */
export const listCardDecksRequestPlugin: ZodiosPlugin = {
  name: "local-list-card-decks",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const id = (config.params ?? {}).id as string | undefined;
      if (!id) {
        throw new Error("[api:listCardDecks] Missing id");
      }
      const data = await listCardDeckMembership(id);

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
