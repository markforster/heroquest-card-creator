import { createPair, createPairWithOverrides } from "@/lib/pairs-service";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const createPairRequestPlugin: ZodiosPlugin = {
  name: "local-create-pair",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const body = (config.data ?? {}) as {
        frontFaceId?: string;
        backFaceId?: string;
        id?: string;
        name?: string;
        nameLower?: string;
        createdAt?: number;
        updatedAt?: number;
        schemaVersion?: 1;
      };
      if (!body.frontFaceId || !body.backFaceId) {
        throw new Error("[api:createPair] Missing frontFaceId/backFaceId");
      }
      const hasOverrides =
        Boolean(body.id) ||
        Boolean(body.name) ||
        Boolean(body.nameLower) ||
        typeof body.createdAt === "number" ||
        typeof body.updatedAt === "number" ||
        typeof body.schemaVersion === "number";
      const data = hasOverrides
        ? await createPairWithOverrides({
            frontFaceId: body.frontFaceId,
            backFaceId: body.backFaceId,
            id: body.id,
            name: body.name,
            nameLower: body.nameLower,
            createdAt: body.createdAt,
            updatedAt: body.updatedAt,
            schemaVersion: body.schemaVersion,
          })
        : await createPair(body.frontFaceId, body.backFaceId);

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
