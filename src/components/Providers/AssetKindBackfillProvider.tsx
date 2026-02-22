"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { classifyAssetBlob } from "@/lib/asset-kind/classify";
import { compareAssetsByDefaultOrder } from "@/lib/assets-grouping";
import type { AssetRecord } from "@/lib/assets-db";
import { getAllAssets, getAssetBlob, updateAssetMeta } from "@/lib/assets-db";

type AssetKindQueueContextValue = {
  enqueueAsset: (id: string, meta?: { width?: number; height?: number }) => void;
  cancelAsset: (id: string) => void;
};

const AssetKindQueueContext = createContext<AssetKindQueueContextValue | undefined>(undefined);

const IDLE_TIMEOUT = 1000;
const BATCH_SIZE = 6;
const MIN_CLASSIFY_MS = 800;

function shouldEnqueue(asset: AssetRecord): boolean {
  if (asset.assetKindSource === "manual") return false;
  if (asset.assetKindStatus === "classified") return false;
  if (asset.assetKindStatus === "unclassified" && asset.assetKindSource === "auto") {
    return false;
  }
  return true;
}

export function AssetKindBackfillProvider({ children }: { children: ReactNode }) {
  const queueRef = useRef<string[]>([]);
  const queueSetRef = useRef<Set<string>>(new Set());
  const cancelledRef = useRef<Set<string>>(new Set());
  const processingRef = useRef(false);
  const classifyStartRef = useRef<Map<string, number>>(new Map());
  const assetDimensionsRef = useRef<Map<string, { width?: number; height?: number }>>(new Map());
  const [queueToken, setQueueToken] = useState(0);

  const enqueueAsset = useCallback((id: string, meta?: { width?: number; height?: number }) => {
    if (meta?.width != null || meta?.height != null) {
      assetDimensionsRef.current.set(id, { width: meta?.width, height: meta?.height });
    }
    if (queueSetRef.current.has(id)) return;
    queueSetRef.current.add(id);
    queueRef.current.push(id);
    setQueueToken((prev) => prev + 1);
  }, []);

  const cancelAsset = useCallback((id: string) => {
    cancelledRef.current.add(id);
    if (queueSetRef.current.has(id)) {
      queueSetRef.current.delete(id);
      queueRef.current = queueRef.current.filter((queuedId) => queuedId !== id);
      setQueueToken((prev) => prev + 1);
    }
  }, []);

  const seedQueue = useCallback(() => {
    getAllAssets()
      .then((assets) => {
        const ordered = assets
          .filter((asset) => shouldEnqueue(asset))
          .slice()
          .sort(compareAssetsByDefaultOrder);
        ordered.forEach((asset) => {
          if (shouldEnqueue(asset)) {
            enqueueAsset(asset.id);
          }
        });
        if (assets.length > 0) {
          assetDimensionsRef.current = new Map(
            assets.map((asset) => [asset.id, { width: asset.width, height: asset.height }]),
          );
        }
      })
      .catch(() => {
        // Ignore backfill failures.
      });
  }, [enqueueAsset]);

  useEffect(() => {
    let active = true;
    if (active) {
      seedQueue();
    }
    const intervalId = window.setInterval(() => {
      if (active) {
        seedQueue();
      }
    }, 60000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [seedQueue]);

  useEffect(() => {
    if (processingRef.current) return;
    if (queueRef.current.length === 0) return;

    let cancelled = false;
    processingRef.current = true;

    const scheduleNext = () => {
      const idleCallback = (window as Window & typeof globalThis).requestIdleCallback;
      if (typeof idleCallback === "function") {
        idleCallback(runBatch, { timeout: IDLE_TIMEOUT });
      } else {
        window.setTimeout(runBatch, 150);
      }
    };

    const runBatch = async () => {
      if (cancelled) return;
      const batch = queueRef.current.splice(0, BATCH_SIZE);
      batch.forEach((id) => queueSetRef.current.delete(id));

      for (const id of batch) {
        if (cancelled) return;
        if (cancelledRef.current.has(id)) continue;

        try {
          const assetMeta = assetDimensionsRef.current.get(id);
          const startedAt = Date.now();
          classifyStartRef.current.set(id, startedAt);
          await updateAssetMeta(id, {
            assetKindStatus: "classifying",
            assetKindSource: "auto",
            assetKindUpdatedAt: Date.now(),
          });
          const blob = await getAssetBlob(id);
          if (!blob || cancelledRef.current.has(id)) {
            await updateAssetMeta(id, {
              assetKindStatus: "unclassified",
              assetKindSource: "auto",
              assetKindUpdatedAt: Date.now(),
            });
            continue;
          }
          const result = await classifyAssetBlob(blob, {
            width: assetMeta?.width ?? 0,
            height: assetMeta?.height ?? 0,
          });
          if (cancelledRef.current.has(id)) continue;
          const elapsed = Date.now() - startedAt;
          if (elapsed < MIN_CLASSIFY_MS) {
            await new Promise<void>((resolve) =>
              window.setTimeout(resolve, MIN_CLASSIFY_MS - elapsed),
            );
          }
          if (result.kind === "unknown") {
            await updateAssetMeta(id, {
              assetKindStatus: "unclassified",
              assetKindSource: "auto",
              assetKindConfidence: result.confidence,
              assetKindUpdatedAt: Date.now(),
            });
          } else {
            await updateAssetMeta(id, {
              assetKindStatus: "classified",
              assetKindSource: "auto",
              assetKind: result.kind,
              assetKindConfidence: result.confidence,
              assetKindUpdatedAt: Date.now(),
            });
          }
          classifyStartRef.current.delete(id);
        } catch {
          // Ignore classification failures.
        }
      }

      processingRef.current = false;
      if (!cancelled && queueRef.current.length > 0) {
        processingRef.current = true;
        scheduleNext();
      }
    };

    scheduleNext();

    return () => {
      cancelled = true;
      processingRef.current = false;
    };
  }, [queueToken]);

  const value = useMemo(
    () => ({
      enqueueAsset,
      cancelAsset,
    }),
    [enqueueAsset, cancelAsset],
  );

  return (
    <AssetKindQueueContext.Provider value={value}>{children}</AssetKindQueueContext.Provider>
  );
}

export function useAssetKindQueue(): AssetKindQueueContextValue {
  const ctx = useContext(AssetKindQueueContext);
  if (!ctx) {
    throw new Error("useAssetKindQueue must be used within AssetKindBackfillProvider");
  }
  return ctx;
}
