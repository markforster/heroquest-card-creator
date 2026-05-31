import { deckSetRebuildBackInputSchema } from "@/api/decks";
import { rebuildSetBack } from "@/lib/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const rebuildDeckSetBackRequestPlugin: ZodiosPlugin = {
  name: "local-rebuild-deck-set-back",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const setId = (config.params ?? {}).setId as string | undefined;
      if (!setId) {
        throw new Error("[api:rebuildDeckSetBack] Missing setId");
      }
      const parsed = deckSetRebuildBackInputSchema.parse(config.data ?? {});
      await rebuildSetBack(setId, parsed.newBackFaceId, parsed.frontFaceIds);
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
