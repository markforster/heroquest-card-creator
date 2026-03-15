import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { ZodiosPlugin } from "@zodios/core";

import { touchCardLastViewedInputSchema } from "@/api/cards";
import { touchCardLastViewed } from "@/lib/cards-db";

export const touchCardLastViewedRequestPlugin: ZodiosPlugin = {
  name: "local-touch-card-last-viewed",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const params = (config.params ?? {}) as Record<string, unknown>;
      const id = typeof params.id === "string" ? params.id : null;
      if (!id) {
        throw new Error("[api:touchCardLastViewed] Missing id param");
      }
      const parsed = touchCardLastViewedInputSchema.parse(config.data ?? {});
      const data = await touchCardLastViewed(id, parsed.viewedAt);

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
