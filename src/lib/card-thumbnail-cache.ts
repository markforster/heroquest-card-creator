"use client";

import { apiClient } from "@/api/client";
import { useEffect, useMemo, useRef, useState } from "react";

type CacheEntry = {
  url: string;
  blob?: Blob | null;
  refCount: number;
};

const MAX_ENTRIES = 200;
const RETRY_DELAYS_MS = [100, 250, 500];

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

function cloneBlob(blob: Blob): Blob {
  try {
    return blob.slice(0, blob.size, blob.type);
  } catch {
    try {
      return new Blob([blob], { type: blob.type });
    } catch {
      return blob;
    }
  }
}

function touchEntry(id: string, entry: CacheEntry) {
  cache.delete(id);
  cache.set(id, entry);
}

function evictIfNeeded() {
  while (cache.size > MAX_ENTRIES) {
    let evicted = false;
    for (const [id, entry] of cache.entries()) {
      if (entry.refCount > 0) {
        continue;
      }
      try {
        URL.revokeObjectURL(entry.url);
      } catch {
        // Ignore revoke failures.
      }
      cache.delete(id);
      evicted = true;
      break;
    }
    if (!evicted) {
      break;
    }
  }
}

export function getCachedCardThumbnailUrl(
  cardId: string,
  blob?: Blob | null,
): string | null {
  if (!cardId) return null;
  const existing = cache.get(cardId);
  if (existing) {
    if (process.env.NODE_ENV !== "production" && blob && existing.blob !== blob) {
      // eslint-disable-next-line no-console
      console.debug("[card-thumbs] Ignoring blob update for cached card", cardId);
    }
    touchEntry(cardId, existing);
    return existing.url;
  }
  if (!blob) return null;
  const safeBlob = cloneBlob(blob);
  const url = URL.createObjectURL(safeBlob);
  const entry: CacheEntry = { url, blob: safeBlob, refCount: 0 };
  cache.set(cardId, entry);
  touchEntry(cardId, entry);
  evictIfNeeded();
  return url;
}

export async function getCardThumbnailUrl(cardId: string): Promise<string | null> {
  if (!cardId) return null;
  const existing = cache.get(cardId);
  if (existing) {
    touchEntry(cardId, existing);
    return existing.url;
  }
  const inflightExisting = inflight.get(cardId);
  if (inflightExisting) {
    return inflightExisting;
  }
  const task = (async () => {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const blob = await getCardThumbnailBlob(cardId);
        if (blob instanceof Blob) {
          return getCachedCardThumbnailUrl(cardId, blob);
        }
      } catch {
        // Ignore read failures; retry below.
      }
      if (attempt < RETRY_DELAYS_MS.length) {
        await new Promise<void>((resolve) =>
          window.setTimeout(resolve, RETRY_DELAYS_MS[attempt]),
        );
      }
    }
    return null;
  })();
  inflight.set(cardId, task);
  try {
    return await task;
  } finally {
    inflight.delete(cardId);
  }
}

export async function getCardThumbnailBlob(cardId: string): Promise<Blob | null> {
  if (!cardId) return null;
  try {
    const blob = await apiClient.getCardThumbnail({ params: { id: cardId } });
    return blob instanceof Blob ? blob : null;
  } catch {
    return null;
  }
}

export function useCardThumbnailUrl(
  cardId?: string | null,
  blob?: Blob | null,
  options?: { enabled?: boolean; useCache?: boolean },
): string | null {
  const enabled = options?.enabled ?? true;
  const useCache = options?.useCache ?? true;
  const [url, setUrl] = useState<string | null>(null);
  const legacyUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!cardId) {
      setUrl(null);
      return () => {
        active = false;
      };
    }

    if (useCache) {
      const cached = getCachedCardThumbnailUrl(cardId, blob ?? null);
      if (cached) {
        setUrl(cached);
        return () => {
          active = false;
        };
      }
      if (!enabled) {
        setUrl(null);
        return () => {
          active = false;
        };
      }
      void (async () => {
        const next = await getCardThumbnailUrl(cardId);
        if (!active) return;
        setUrl(next);
      })();
      return () => {
        active = false;
      };
    }

    if (legacyUrlRef.current) {
      releaseLegacyCardThumbnailUrl(legacyUrlRef.current);
      legacyUrlRef.current = null;
    }

    if (blob) {
      const legacyUrl = getLegacyCardThumbnailUrl(cardId, blob);
      legacyUrlRef.current = legacyUrl;
      setUrl(legacyUrl);
      return () => {
        if (legacyUrlRef.current) {
          releaseLegacyCardThumbnailUrl(legacyUrlRef.current);
          legacyUrlRef.current = null;
        }
        active = false;
      };
    }

    if (!enabled) {
      setUrl(null);
      return () => {
        active = false;
      };
    }

    void (async () => {
      const fetched = await getCardThumbnailBlob(cardId);
      if (!active) return;
      if (fetched) {
        const legacyUrl = getLegacyCardThumbnailUrl(cardId, fetched);
        legacyUrlRef.current = legacyUrl;
        setUrl(legacyUrl);
      } else {
        setUrl(null);
      }
    })();

    return () => {
      if (legacyUrlRef.current) {
        releaseLegacyCardThumbnailUrl(legacyUrlRef.current);
        legacyUrlRef.current = null;
      }
      active = false;
    };
  }, [blob, cardId, enabled, useCache]);

  return useMemo(() => url, [url]);
}

export function invalidateCardThumbnail(cardId?: string): void {
  if (!cardId) {
    cache.forEach((entry) => {
      try {
        URL.revokeObjectURL(entry.url);
      } catch {
        // Ignore revoke failures.
      }
    });
    cache.clear();
    return;
  }
  const entry = cache.get(cardId);
  if (entry) {
    try {
      URL.revokeObjectURL(entry.url);
    } catch {
      // Ignore revoke failures.
    }
    cache.delete(cardId);
  }
}

export function retainCardThumbnail(cardId: string): void {
  if (!cardId) return;
  const entry = cache.get(cardId);
  if (entry) {
    entry.refCount += 1;
  }
}

export function releaseCardThumbnail(cardId: string): void {
  if (!cardId) return;
  const entry = cache.get(cardId);
  if (entry) {
    entry.refCount = Math.max(0, entry.refCount - 1);
  }
}

export function releaseCardThumbnailUrl(cardId: string): void {
  releaseCardThumbnail(cardId);
}

export function getLegacyCardThumbnailUrl(
  cardId: string,
  blob?: Blob | null,
): string | null {
  if (!cardId || !blob) return null;
  const safeBlob = cloneBlob(blob);
  return URL.createObjectURL(safeBlob);
}

export function releaseLegacyCardThumbnailUrl(url?: string | null): void {
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    // Ignore revoke failures.
  }
}
