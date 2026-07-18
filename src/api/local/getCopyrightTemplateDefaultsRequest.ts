import { getCopyrightTemplateDefaults } from "@/lib/settings-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

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
