import { deleteHeroBackLogoRemediationSchema } from "@/api/heroBackLogos";
import { deleteHeroBackLogo } from "@/lib/data/hero-back-logos-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local delete-hero-back-logo endpoint through the IndexedDB-backed service layer.
 */
export const deleteHeroBackLogoRequestPlugin: ZodiosPlugin = {
  name: "local-delete-hero-back-logo",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const params = (config.params ?? {}) as Record<string, unknown>;
      const id = typeof params.id === "string" ? params.id : null;
      if (!id) {
        throw new Error("[api:deleteHeroBackLogo] Missing id param");
      }
      const remediation = deleteHeroBackLogoRemediationSchema.parse(config.data ?? {});
      const data = await deleteHeroBackLogo(id, remediation);

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
