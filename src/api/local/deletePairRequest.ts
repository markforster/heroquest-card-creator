import { deletePair } from "@/lib/pairs-service";

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
