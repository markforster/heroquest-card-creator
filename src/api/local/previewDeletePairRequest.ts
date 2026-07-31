import { previewDeletePair } from "@/lib/data/pairs-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local preview-delete-pair endpoint through the IndexedDB-backed service layer.
 */
export const previewDeletePairRequestPlugin: ZodiosPlugin = {
  name: "local-preview-delete-pair",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const body = (config.data ?? {}) as {
        frontFaceId?: string;
        backFaceId?: string;
        mode?: "block" | "confirmable-cascade";
      };
      if (!body.frontFaceId || !body.backFaceId) {
        throw new Error("[api:previewDeletePair] Missing frontFaceId/backFaceId");
      }
      const data = await previewDeletePair(body.frontFaceId, body.backFaceId, {
        mode: body.mode,
      });

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
