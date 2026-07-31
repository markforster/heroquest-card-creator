import { deletePairsForFaces } from "@/lib/data/pairs-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local delete-pairs-for-faces endpoint through the IndexedDB-backed service layer.
 */
export const deletePairsForFacesRequestPlugin: ZodiosPlugin = {
  name: "local-delete-pairs-for-faces",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const body = (config.data ?? {}) as {
        faceIds?: string[];
        mode?: "block" | "confirmable-cascade";
        confirmCascade?: boolean;
      };
      if (!Array.isArray(body.faceIds)) {
        throw new Error("[api:deletePairsForFaces] Missing faceIds");
      }
      const data = await deletePairsForFaces(body.faceIds, {
        mode: body.mode,
        confirmCascade: body.confirmCascade,
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
