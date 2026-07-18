import { setCopyrightTemplateDefaultsInputSchema } from "@/api/settings";
import { setCopyrightTemplateDefaults } from "@/lib/settings-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const setCopyrightTemplateDefaultsRequestPlugin: ZodiosPlugin = {
  name: "local-set-copyright-template-defaults",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const parsed = setCopyrightTemplateDefaultsInputSchema.parse(config.data ?? {});
      await setCopyrightTemplateDefaults(parsed.value);

      return {
        data: undefined,
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
