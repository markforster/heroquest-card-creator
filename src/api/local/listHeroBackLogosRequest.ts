import { listHeroBackLogos } from "@/lib/data/hero-back-logos-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local list-hero-back-logos endpoint through the IndexedDB-backed service layer.
 */
export const listHeroBackLogosRequestPlugin: ZodiosPlugin = {
  name: "local-list-hero-back-logos",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const data = await listHeroBackLogos();

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
