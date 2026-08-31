import { getCopyrightTemplateDefaults } from "@/lib/data/settings-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Serves the local get-copyright-template-defaults endpoint through the IndexedDB-backed service layer.
 */
export const getCopyrightTemplateDefaultsRequestPlugin: ZodiosPlugin = {
  name: "local-get-copyright-template-defaults",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const data = await getCopyrightTemplateDefaults();

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
