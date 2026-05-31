import { deckEntryCountUpdateInputSchema } from "@/api/decks";
import { updateEntryCount } from "@/lib/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const updateDeckEntryCountRequestPlugin: ZodiosPlugin = {
  name: "local-update-deck-entry-count",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const setId = (config.params ?? {}).setId as string | undefined;
      if (!setId) {
        throw new Error("[api:updateDeckEntryCount] Missing setId");
      }
      const parsed = deckEntryCountUpdateInputSchema.parse(config.data ?? {});
      const data = await updateEntryCount(setId, parsed.entryId, parsed.count);
      if (!data) {
        throw new Error("[api:updateDeckEntryCount] Entry not found");
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
