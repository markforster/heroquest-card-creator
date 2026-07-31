import { deleteSet } from "@/lib/data/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local delete-deck-set endpoint through the IndexedDB-backed service layer.
 */
export const deleteDeckSetRequestPlugin: ZodiosPlugin = {
  name: "local-delete-deck-set",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const setId = (config.params ?? {}).setId as string | undefined;
      if (!setId) {
        throw new Error("[api:deleteDeckSet] Missing setId");
      }
      await deleteSet(setId);
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
