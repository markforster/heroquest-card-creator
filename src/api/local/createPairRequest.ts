import { createPair } from "@/lib/pairs-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const createPairRequestPlugin: ZodiosPlugin = {
  name: "local-create-pair",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const body = (config.data ?? {}) as { frontFaceId?: string; backFaceId?: string };
      if (!body.frontFaceId || !body.backFaceId) {
        throw new Error("[api:createPair] Missing frontFaceId/backFaceId");
      }
      const data = await createPair(body.frontFaceId, body.backFaceId);

      return {
        data,
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
