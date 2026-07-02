"use client";

import { useEffect, useState } from "react";

import { apiClient } from "@/api/client";

export type AssetImageStatus = "idle" | "loading" | "ready" | "missing";

async function loadObjectUrlImageDimensions(
  url: string,
): Promise<{ width: number; height: number } | null> {
  if (typeof Image === "undefined") return null;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image dimensions"));
    img.src = url;
  });

  if (!img.naturalWidth || !img.naturalHeight) return null;
  return { width: img.naturalWidth, height: img.naturalHeight };
}

export function useAssetImageUrl(
  assetId?: string,
): {
  url: string | null;
  status: AssetImageStatus;
  width: number | null;
  height: number | null;
} {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<AssetImageStatus>("idle");
  const [width, setWidth] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let localUrl: string | null = null;

    if (!assetId) {
      setUrl(null);
      setStatus("idle");
      setWidth(null);
      setHeight(null);
      return () => {};
    }

    (async () => {
      try {
        setStatus("loading");
        setWidth(null);
        setHeight(null);
        const next = await apiClient.getAssetObjectUrl({ params: { id: assetId } });
        localUrl = next;
        if (!cancelled) {
          const dimensions = next ? await loadObjectUrlImageDimensions(next) : null;
          if (cancelled) {
            if (next) {
              URL.revokeObjectURL(next);
            }
            return;
          }
          setUrl(next);
          setWidth(dimensions?.width ?? null);
          setHeight(dimensions?.height ?? null);
          setStatus(next ? "ready" : "missing");
        } else if (next) {
          URL.revokeObjectURL(next);
        }
      } catch {
        if (!cancelled) {
          setUrl(null);
          setWidth(null);
          setHeight(null);
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

  return { url, status, width, height };
}
