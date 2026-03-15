"use client";

import { useEffect, useState } from "react";

import { apiClient } from "@/api/client";

export type AssetImageStatus = "idle" | "loading" | "ready" | "missing";

export function useAssetImageUrl(
  assetId?: string,
): { url: string | null; status: AssetImageStatus } {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<AssetImageStatus>("idle");

  useEffect(() => {
    let cancelled = false;
    let localUrl: string | null = null;

    if (!assetId) {
      setUrl(null);
      setStatus("idle");
      return () => {};
    }

    (async () => {
      try {
        setStatus("loading");
        const next = await apiClient.getAssetObjectUrl({ params: { id: assetId } });
        localUrl = next;
        if (!cancelled) {
          setUrl(next);
          setStatus(next ? "ready" : "missing");
        } else if (next) {
          URL.revokeObjectURL(next);
        }
      } catch {
        if (!cancelled) {
          setUrl(null);
          setStatus("missing");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
    };
  }, [assetId]);

  return { url, status };
}
