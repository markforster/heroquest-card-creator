import { listAllPairs, listPairsForFace } from "@/lib/data/pairs-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local list-pairs endpoint, optionally narrowing results to a single face id.
 */
export const listPairsRequestPlugin: ZodiosPlugin = {
  name: "local-list-pairs",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const queries = (config.queries ?? {}) as Record<string, unknown>;
      const faceId = typeof queries.faceId === "string" ? queries.faceId : null;
      const data = faceId ? await listPairsForFace(faceId) : await listAllPairs();

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
