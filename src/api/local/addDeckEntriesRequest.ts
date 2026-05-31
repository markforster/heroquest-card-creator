import { deckEntryAddFrontsInputSchema } from "@/api/decks";
import { addFrontsToSet } from "@/lib/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const addDeckEntriesRequestPlugin: ZodiosPlugin = {
  name: "local-add-deck-entries",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const setId = (config.params ?? {}).setId as string | undefined;
      if (!setId) {
        throw new Error("[api:addDeckEntries] Missing setId");
      }
      const parsed = deckEntryAddFrontsInputSchema.parse(config.data ?? {});
      const data = await addFrontsToSet(setId, parsed.frontFaceIds);
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
