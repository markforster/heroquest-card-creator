import { setBorderSwatchesInputSchema } from "@/api/settings";
import { setBorderSwatches } from "@/lib/settings-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const setBorderSwatchesRequestPlugin: ZodiosPlugin = {
  name: "local-set-border-swatches",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const parsed = setBorderSwatchesInputSchema.parse(config.data ?? {});
      await setBorderSwatches(parsed.swatches);

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
