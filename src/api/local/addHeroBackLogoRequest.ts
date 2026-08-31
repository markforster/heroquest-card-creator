import { addHeroBackLogoInputSchema } from "@/api/heroBackLogos";
import { addHeroBackLogo } from "@/lib/data/hero-back-logos-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local add-hero-back-logo endpoint through the IndexedDB-backed service layer.
 */
export const addHeroBackLogoRequestPlugin: ZodiosPlugin = {
  name: "local-add-hero-back-logo",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const parsed = addHeroBackLogoInputSchema.parse(config.data ?? {});
      const { id, blob, ...meta } = parsed;
      await addHeroBackLogo(id, blob, meta);

      return {
        data: undefined,
        status: 201,
        statusText: "Created",
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
