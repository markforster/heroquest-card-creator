"use client";

import { useEffect, useState } from "react";

import { getAssetObjectUrl } from "@/lib/assets-db";

export function useAssetImageUrl(assetId?: string) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let localUrl: string | null = null;

    if (!assetId) {
      setUrl(null);
      return () => {};
    }

    (async () => {
      try {
        const next = await getAssetObjectUrl(assetId);
        localUrl = next;
        if (!cancelled) {
          setUrl(next);
        } else if (next) {
          URL.revokeObjectURL(next);
        }
      } catch {
        if (!cancelled) {
          setUrl(null);
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

  return url;
}

