import { listGroups } from "@/lib/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const listDeckGroupsRequestPlugin: ZodiosPlugin = {
  name: "local-list-deck-groups",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const deckId = (config.params ?? {}).deckId as string | undefined;
      if (!deckId) {
        throw new Error("[api:listDeckGroups] Missing deckId");
      }
      const data = await listGroups(deckId);
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
