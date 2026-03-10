import { updateCardThumbnail } from "@/lib/cards-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const updateCardThumbnailRequestPlugin: ZodiosPlugin = {
  name: "local-update-card-thumbnail",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const params = (config.params ?? {}) as Record<string, unknown>;
      const id = typeof params.id === "string" ? params.id : null;
      if (!id) {
        throw new Error("[api:updateCardThumbnail] Missing id param");
      }
      const body = (config.data ?? {}) as { thumbnailBlob?: Blob | null };
      const result = await updateCardThumbnail(id, body.thumbnailBlob ?? null);

      return {
        data: result,
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
