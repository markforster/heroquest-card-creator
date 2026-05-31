import { deckEntryRemoveInputSchema } from "@/api/decks";
import { removeEntries } from "@/lib/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const removeDeckEntriesRequestPlugin: ZodiosPlugin = {
  name: "local-remove-deck-entries",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const setId = (config.params ?? {}).setId as string | undefined;
      if (!setId) {
        throw new Error("[api:removeDeckEntries] Missing setId");
      }
      const parsed = deckEntryRemoveInputSchema.parse(config.data ?? {});
      await removeEntries(setId, parsed.entryIds);
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
