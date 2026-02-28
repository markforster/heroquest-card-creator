"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { classifyAssetBlob } from "@/lib/asset-kind/classify";
import { compareAssetsByDefaultOrder } from "@/lib/assets-grouping";
import type { AssetRecord } from "@/lib/assets-db";
import { getAllAssets, getAssetBlob, updateAssetMeta } from "@/lib/assets-db";
import { getAssetAutoClassifyEnabled } from "@/lib/asset-auto-classify";
import { isSafariBrowser } from "@/lib/browser";

type AssetKindQueueContextValue = {
  enqueueAsset: (id: string, meta?: { width?: number; height?: number }) => void;
  cancelAsset: (id: string) => void;
  setIsActive: (isActive: boolean) => void;
  setAutoClassifyEnabled: (isEnabled: boolean) => void;
};

const AssetKindQueueContext = createContext<AssetKindQueueContextValue | undefined>(undefined);

const IDLE_TIMEOUT = 1500;
const BATCH_SIZE = 2;
const MIN_CLASSIFY_MS = 800;
const MAX_PER_ACTIVATION = 30;
const ACTIVATION_COOLDOWN_MS = 5000;
const CLASSIFY_TIMEOUT_MS = 2 * 60 * 1000;
const UPDATE_FAILURE_DELAY_MS = 200;

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
  const assetStatusRef = useRef<Map<string, { status?: AssetRecord["assetKindStatus"]; updatedAt?: number }>>(
    new Map(),
  );
  const processedThisActivationRef = useRef(0);
  const cooldownUntilRef = useRef(0);
  const warnedUpdateIdsRef = useRef<Set<string>>(new Set());
  const requestedActiveRef = useRef(false);
  const [queueToken, setQueueToken] = useState(0);
  const [isActive, setIsActiveState] = useState(false);
  const [isAutoClassifyEnabled, setIsAutoClassifyEnabled] = useState(() =>
    getAssetAutoClassifyEnabled(),
  );
  const isSafari = useMemo(
    () => (typeof window !== "undefined" ? isSafariBrowser() : false),
    [],
  );
  const setIsActive = useCallback(
    (next: boolean) => {
      requestedActiveRef.current = next;
      if ((isSafari || !isAutoClassifyEnabled) && next) return;
      setIsActiveState(next);
    },
    [isAutoClassifyEnabled, isSafari],
  );
  const setAutoClassifyEnabled = useCallback((next: boolean) => {
    setIsAutoClassifyEnabled(next);
    if (!next) {
      setIsActiveState(false);
    }
  }, []);

  useEffect(() => {
    if (!isAutoClassifyEnabled || isSafari) return;
    if (requestedActiveRef.current) {
      setIsActiveState(true);
    }
  }, [isAutoClassifyEnabled, isSafari]);

  useEffect(() => {
    setIsAutoClassifyEnabled(getAssetAutoClassifyEnabled());
  }, []);

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
        assetStatusRef.current = new Map(
          assets.map((asset) => [
            asset.id,
            { status: asset.assetKindStatus, updatedAt: asset.assetKindUpdatedAt },
          ]),
        );
        ordered.forEach((asset) => {
          if (
            asset.assetKindStatus === "classifying" &&
            asset.assetKindUpdatedAt &&
            Date.now() - asset.assetKindUpdatedAt > CLASSIFY_TIMEOUT_MS
          ) {
            updateAssetMeta(asset.id, {
              assetKindStatus: "unclassified",
              assetKindSource: "auto",
              assetKindUpdatedAt: Date.now(),
            })
              .then(() => {
                assetStatusRef.current.set(asset.id, {
                  status: "unclassified",
                  updatedAt: Date.now(),
                });
              })
              .catch(() => {
                // Ignore reset failures during seeding.
              });
          }
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
    if (!isAutoClassifyEnabled) return;
    if (isSafari) return;
    if (!isActive) return;
    processedThisActivationRef.current = 0;
    cooldownUntilRef.current = 0;
    warnedUpdateIdsRef.current.clear();
    let active = true;
    seedQueue();
    const intervalId = window.setInterval(() => {
      if (active) {
        seedQueue();
      }
    }, 60000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [isActive, isAutoClassifyEnabled, isSafari, seedQueue]);

  useEffect(() => {
    if (!isAutoClassifyEnabled) return;
    if (isSafari) return;
    if (!isActive) return;
    if (processingRef.current) return;
    if (queueRef.current.length === 0) return;

    let cancelled = false;
    processingRef.current = true;

    const scheduleNext = () => {
      const idleCallback = (window as Window & typeof globalThis).requestIdleCallback;
      if (!isActive || isSafari || !isAutoClassifyEnabled) return;
      if (typeof idleCallback === "function") {
        idleCallback(runBatch, { timeout: IDLE_TIMEOUT });
      } else {
        window.setTimeout(runBatch, 150);
      }
    };

    const runBatch = async () => {
      if (cancelled || !isActive || isSafari || !isAutoClassifyEnabled) return;
      const now = Date.now();
      if (cooldownUntilRef.current > now) {
        window.setTimeout(runBatch, cooldownUntilRef.current - now);
        return;
      }
      if (processedThisActivationRef.current >= MAX_PER_ACTIVATION) {
        cooldownUntilRef.current = now + ACTIVATION_COOLDOWN_MS;
        window.setTimeout(runBatch, ACTIVATION_COOLDOWN_MS);
        return;
      }
      const batch = queueRef.current.splice(0, BATCH_SIZE);
      batch.forEach((id) => queueSetRef.current.delete(id));

      for (const id of batch) {
        if (cancelled || !isActive || isSafari || !isAutoClassifyEnabled) return;
        if (cancelledRef.current.has(id)) continue;

        const startedAt = Date.now();
        const lastStatus = assetStatusRef.current.get(id);
        if (
          lastStatus?.status === "classifying" &&
          lastStatus.updatedAt &&
          startedAt - lastStatus.updatedAt > CLASSIFY_TIMEOUT_MS
        ) {
          updateAssetMeta(id, {
            assetKindStatus: "unclassified",
            assetKindSource: "auto",
            assetKindUpdatedAt: Date.now(),
          })
            .then(() => {
              assetStatusRef.current.set(id, {
                status: "unclassified",
                updatedAt: Date.now(),
              });
            })
            .catch(() => {
              // Ignore reset failures during batch.
            });
          enqueueAsset(id);
          processedThisActivationRef.current += 1;
          continue;
        }
        try {
          const assetMeta = assetDimensionsRef.current.get(id);
          classifyStartRef.current.set(id, startedAt);
          try {
            await updateAssetMeta(id, {
              assetKindStatus: "classifying",
              assetKindSource: "auto",
              assetKindUpdatedAt: Date.now(),
            });
            assetStatusRef.current.set(id, {
              status: "classifying",
              updatedAt: Date.now(),
            });
          } catch (error) {
            if (!warnedUpdateIdsRef.current.has(id)) {
              warnedUpdateIdsRef.current.add(id);
              // eslint-disable-next-line no-console
              console.warn("[asset-kind] Failed to mark asset as classifying", id, error);
            }
            enqueueAsset(id);
            await new Promise<void>((resolve) =>
              window.setTimeout(resolve, UPDATE_FAILURE_DELAY_MS),
            );
            continue;
          }
          const blob = await getAssetBlob(id);
          if (!blob || cancelledRef.current.has(id)) {
            try {
              await updateAssetMeta(id, {
                assetKindStatus: "unclassified",
                assetKindSource: "auto",
                assetKindUpdatedAt: Date.now(),
              });
              assetStatusRef.current.set(id, {
                status: "unclassified",
                updatedAt: Date.now(),
              });
            } catch (error) {
              if (!warnedUpdateIdsRef.current.has(id)) {
                warnedUpdateIdsRef.current.add(id);
                // eslint-disable-next-line no-console
                console.warn("[asset-kind] Failed to reset asset after missing blob", id, error);
              }
              await new Promise<void>((resolve) =>
                window.setTimeout(resolve, UPDATE_FAILURE_DELAY_MS),
              );
            }
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
            try {
              await updateAssetMeta(id, {
                assetKindStatus: "unclassified",
                assetKindSource: "auto",
                assetKindConfidence: result.confidence,
                assetKindUpdatedAt: Date.now(),
              });
              assetStatusRef.current.set(id, {
                status: "unclassified",
                updatedAt: Date.now(),
              });
            } catch (error) {
              if (!warnedUpdateIdsRef.current.has(id)) {
                warnedUpdateIdsRef.current.add(id);
                // eslint-disable-next-line no-console
                console.warn("[asset-kind] Failed to update unknown classification", id, error);
              }
              await new Promise<void>((resolve) =>
                window.setTimeout(resolve, UPDATE_FAILURE_DELAY_MS),
              );
            }
          } else {
            try {
              await updateAssetMeta(id, {
                assetKindStatus: "classified",
                assetKindSource: "auto",
                assetKind: result.kind,
                assetKindConfidence: result.confidence,
                assetKindUpdatedAt: Date.now(),
              });
              assetStatusRef.current.set(id, {
                status: "classified",
                updatedAt: Date.now(),
              });
            } catch (error) {
              if (!warnedUpdateIdsRef.current.has(id)) {
                warnedUpdateIdsRef.current.add(id);
                // eslint-disable-next-line no-console
                console.warn("[asset-kind] Failed to finalize classification", id, error);
              }
              await new Promise<void>((resolve) =>
                window.setTimeout(resolve, UPDATE_FAILURE_DELAY_MS),
              );
            }
          }
        } catch {
          try {
            await updateAssetMeta(id, {
              assetKindStatus: "unclassified",
              assetKindSource: "auto",
              assetKindUpdatedAt: Date.now(),
            });
            assetStatusRef.current.set(id, {
              status: "unclassified",
              updatedAt: Date.now(),
            });
          } catch (error) {
            if (!warnedUpdateIdsRef.current.has(id)) {
              warnedUpdateIdsRef.current.add(id);
              // eslint-disable-next-line no-console
              console.warn("[asset-kind] Failed to reset asset after error", id, error);
            }
            await new Promise<void>((resolve) =>
              window.setTimeout(resolve, UPDATE_FAILURE_DELAY_MS),
            );
          }
        } finally {
          classifyStartRef.current.delete(id);
          processedThisActivationRef.current += 1;
        }
      }

      processingRef.current = false;
      if (!cancelled && isActive && queueRef.current.length > 0) {
        processingRef.current = true;
        scheduleNext();
      }
    };

    scheduleNext();

    return () => {
      cancelled = true;
      processingRef.current = false;
    };
  }, [isActive, queueToken]);

  const value = useMemo(
    () => ({
      enqueueAsset,
      cancelAsset,
      setIsActive,
      setAutoClassifyEnabled,
    }),
    [enqueueAsset, cancelAsset, setAutoClassifyEnabled, setIsActive],
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
