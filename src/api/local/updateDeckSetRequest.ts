import { deckSetUpdateInputSchema } from "@/api/decks";
import { updateSet } from "@/lib/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const updateDeckSetRequestPlugin: ZodiosPlugin = {
  name: "local-update-deck-set",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const setId = (config.params ?? {}).setId as string | undefined;
      if (!setId) {
        throw new Error("[api:updateDeckSet] Missing setId");
      }
      const parsed = deckSetUpdateInputSchema.parse(config.data ?? {});
      const data = await updateSet(setId, parsed);
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
