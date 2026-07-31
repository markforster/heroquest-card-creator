import { deleteGroup } from "@/lib/data/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local delete-deck-group endpoint through the IndexedDB-backed service layer.
 */
export const deleteDeckGroupRequestPlugin: ZodiosPlugin = {
  name: "local-delete-deck-group",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const groupId = (config.params ?? {}).groupId as string | undefined;
      if (!groupId) {
        throw new Error("[api:deleteDeckGroup] Missing groupId");
      }
      await deleteGroup(groupId);
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
