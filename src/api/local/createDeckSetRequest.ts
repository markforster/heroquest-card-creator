import { deckSetCreateInputSchema } from "@/api/decks";
import { createSet } from "@/lib/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const createDeckSetRequestPlugin: ZodiosPlugin = {
  name: "local-create-deck-set",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const parsed = deckSetCreateInputSchema.parse(config.data ?? {});
      const data = await createSet(parsed.deckId, parsed.groupId, parsed);
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
