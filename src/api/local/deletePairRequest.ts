import { deletePair, listPairsForFace } from "@/lib/pairs-service";
import { createPairInUseError } from "@/lib/decks-errors";
import { getDeckUsageForPair } from "@/lib/decks-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const deletePairRequestPlugin: ZodiosPlugin = {
  name: "local-delete-pair",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const body = (config.data ?? {}) as { frontFaceId?: string; backFaceId?: string };
      if (!body.frontFaceId || !body.backFaceId) {
        throw new Error("[api:deletePair] Missing frontFaceId/backFaceId");
      }
      const pairs = await listPairsForFace(body.frontFaceId);
      const pair = pairs.find(
        (candidate) =>
          candidate.frontFaceId === body.frontFaceId && candidate.backFaceId === body.backFaceId,
      );
      if (pair) {
        const usage = await getDeckUsageForPair(pair.id);
        if (usage.length > 0) {
          throw createPairInUseError(usage);
        }
      }
      await deletePair(body.frontFaceId, body.backFaceId);

      return {
        data: undefined,
        status: 200,
        statusText: "OK",
        headers: {
          "x-hqcc-source": "indexeddb",
        },
        config: config as InternalAxiosRequestConfig,
        request: undefined,
      };
    };

    return {
      ...config,
      adapter,
    };
  },
};
