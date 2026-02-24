"use client";

import { getCard } from "@/lib/cards-db";

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
        const record = await getCard(cardId);
        if (record?.thumbnailBlob instanceof Blob) {
          return getCachedCardThumbnailUrl(cardId, record.thumbnailBlob);
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
