import { replaceAsset } from "@/lib/assets-db";

import type { ZodiosPlugin } from "@zodios/core";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const replaceAssetRequestPlugin: ZodiosPlugin = {
  name: "local-replace-asset",
  request: async (apiDefinitions, config) => {
    const adapter = async (): Promise<AxiosResponse> => {
      const params = (config.params ?? {}) as Record<string, unknown>;
      const id = typeof params.id === "string" ? params.id : null;
      if (!id) {
        throw new Error("[api:replaceAsset] Missing id param");
      }
      const body = (config.data ?? {}) as {
        blob?: Blob;
        name?: string;
        mimeType?: string;
        width?: number;
        height?: number;
        createdAt?: number;
        assetKind?: "icon" | "artwork";
        assetKindStatus?: "unclassified" | "classifying" | "classified";
        assetKindSource?: "auto" | "manual";
        assetKindConfidence?: number;
        assetKindUpdatedAt?: number;
      };
      if (!(body.blob instanceof Blob)) {
        throw new Error("[api:replaceAsset] Missing blob payload");
      }
      await replaceAsset(
        id,
        body.blob,
        {
          name: body.name ?? "",
          mimeType: body.mimeType ?? "application/octet-stream",
          width: body.width ?? 0,
          height: body.height ?? 0,
          assetKind: body.assetKind,
          assetKindStatus: body.assetKindStatus,
          assetKindSource: body.assetKindSource,
          assetKindConfidence: body.assetKindConfidence,
          assetKindUpdatedAt: body.assetKindUpdatedAt,
        },
        body.createdAt,
      );

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
