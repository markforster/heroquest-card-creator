import { deckGroupReorderInputSchema } from "@/api/decks";
import { reorderGroups } from "@/lib/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const reorderDeckGroupsRequestPlugin: ZodiosPlugin = {
  name: "local-reorder-deck-groups",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const deckId = (config.params ?? {}).deckId as string | undefined;
      if (!deckId) {
        throw new Error("[api:reorderDeckGroups] Missing deckId");
      }
      const parsed = deckGroupReorderInputSchema.parse(config.data ?? {});
      await reorderGroups(deckId, parsed.orderedGroupIds);
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
