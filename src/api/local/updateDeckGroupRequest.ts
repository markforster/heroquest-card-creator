import { deckGroupUpdateInputSchema } from "@/api/decks";
import { updateGroup } from "@/lib/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const updateDeckGroupRequestPlugin: ZodiosPlugin = {
  name: "local-update-deck-group",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const groupId = (config.params ?? {}).groupId as string | undefined;
      if (!groupId) {
        throw new Error("[api:updateDeckGroup] Missing groupId");
      }
      const parsed = deckGroupUpdateInputSchema.parse(config.data ?? {});
      const data = await updateGroup(groupId, parsed);
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
