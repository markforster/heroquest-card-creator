import { listGroups } from "@/lib/data/decks-service";
import { isDebugToolsEnabled } from "@/lib/env";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local list-deck-groups endpoint through the IndexedDB-backed service layer.
 */
export const listDeckGroupsRequestPlugin: ZodiosPlugin = {
  name: "local-list-deck-groups",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const deckId = (config.params ?? {}).deckId as string | undefined;
      if (!deckId) {
        throw new Error("[api:listDeckGroups] Missing deckId");
      }
      const data = await listGroups(deckId);
      if (isDebugToolsEnabled()) {
        console.debug("[groups:reorder] list-groups", {
          deckId,
          groups: JSON.stringify(data.map((group) => ({ id: group.id, sortIndex: group.sortIndex }))),
        });
      }
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
