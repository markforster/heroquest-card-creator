import { deckGroupCreateInputSchema } from "@/api/decks";
import { createGroup } from "@/lib/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const createDeckGroupRequestPlugin: ZodiosPlugin = {
  name: "local-create-deck-group",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const deckId = (config.params ?? {}).deckId as string | undefined;
      if (!deckId) {
        throw new Error("[api:createDeckGroup] Missing deckId");
      }
      const parsed = deckGroupCreateInputSchema.parse(config.data ?? {});
      const data = await createGroup(deckId, parsed);
      return {
        data,
        status: 201,
        statusText: "Created",
        headers: { "x-hqcc-source": "indexeddb" },
        config: config as InternalAxiosRequestConfig,
        request: undefined,
      };
    };
    return { ...config, adapter };
  },
};
