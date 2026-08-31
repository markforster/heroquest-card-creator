import { getHeroBackLogoUsage } from "@/lib/data/hero-back-logos-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local get-hero-back-logo-usage endpoint through the IndexedDB-backed service layer.
 */
export const getHeroBackLogoUsageRequestPlugin: ZodiosPlugin = {
  name: "local-get-hero-back-logo-usage",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const params = (config.params ?? {}) as Record<string, unknown>;
      const id = typeof params.id === "string" ? params.id : null;
      if (!id) {
        throw new Error("[api:getHeroBackLogoUsage] Missing id param");
      }
      const data = await getHeroBackLogoUsage(id);

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
