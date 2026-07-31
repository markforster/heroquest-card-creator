import { listEntriesForSet } from "@/lib/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local list-deck-entries endpoint through the IndexedDB-backed service layer.
 */
export const listDeckEntriesRequestPlugin: ZodiosPlugin = {
  name: "local-list-deck-entries",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const setId = (config.params ?? {}).setId as string | undefined;
      if (!setId) {
        throw new Error("[api:listDeckEntries] Missing setId");
      }
      const data = await listEntriesForSet(setId);
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
