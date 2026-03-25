import { listDecks } from "@/lib/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const listDecksRequestPlugin: ZodiosPlugin = {
  name: "local-list-decks",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const queries = (config.queries ?? {}) as Record<string, unknown>;
      const q = typeof queries.q === "string" ? queries.q : undefined;
      const data = await listDecks({ search: q });

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
