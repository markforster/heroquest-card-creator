import { deckSetReorderInputSchema } from "@/api/decks";
import { getSet, reorderSets } from "@/lib/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const reorderDeckSetsRequestPlugin: ZodiosPlugin = {
  name: "local-reorder-deck-sets",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const setId = (config.params ?? {}).setId as string | undefined;
      if (!setId) {
        throw new Error("[api:reorderDeckSets] Missing setId");
      }
      const parsed = deckSetReorderInputSchema.parse(config.data ?? {});
      const set = await getSet(setId);
      if (!set) {
        return {
          data: undefined,
          status: 200,
          statusText: "OK",
          headers: { "x-hqcc-source": "indexeddb" },
          config: config as InternalAxiosRequestConfig,
          request: undefined,
        };
      }
      await reorderSets(set.deckId, set.groupId, parsed.orderedSetIds);
      return {
        data: undefined,
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
