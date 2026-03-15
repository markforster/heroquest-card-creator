"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import {
  ENABLE_MISSING_ASSET_CHECKS,
  ENABLE_MISSING_ASSET_INITIAL_SCAN,
  ENABLE_MISSING_ASSET_PERIODIC_SCAN,
} from "@/config/flags";
import { apiClient } from "@/api/client";
import type { CardRecord } from "@/api/cards";
import { buildAssetCache } from "@/lib/export-assets-cache";
import type { MissingAssetReport } from "@/lib/export-assets-cache";

import type { ReactNode } from "react";

const SCAN_BATCH_SIZE = 6;
const SCAN_INTERVAL_MS = 5 * 60 * 1000;

type MissingAssetsContextValue = {
  missingAssetsReport: MissingAssetReport[];
  missingArtworkIds: Set<string>;
  runMissingAssetsScan: (reason?: "initial" | "periodic" | "assets-deleted") => void;
};

const MissingAssetsContext = createContext<MissingAssetsContextValue | undefined>(undefined);

const scheduleIdle = (cb: () => void) => {
  const idleApi = globalThis as {
    requestIdleCallback?: (fn: () => void) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof idleApi.requestIdleCallback === "function") {
    const id = idleApi.requestIdleCallback(cb);
    return () => {
      idleApi.cancelIdleCallback?.(id);
    };
  }
  const id = globalThis.setTimeout(cb, 0);
  return () => globalThis.clearTimeout(id);
};

export function MissingAssetsProvider({ children }: { children: ReactNode }) {
  const [missingAssetsReport, setMissingAssetsReport] = useState<MissingAssetReport[]>([]);
  const scanInFlightRef = useRef(false);
  const queuedScanRef = useRef(false);

  const missingArtworkIds = useMemo(() => {
    return new Set(missingAssetsReport.map((entry) => entry.cardId));
  }, [missingAssetsReport]);

  const runMissingAssetsScan = useCallback((reason?: "initial" | "periodic" | "assets-deleted") => {
    if (!ENABLE_MISSING_ASSET_CHECKS) {
      void reason;
      return;
    }
    void reason;
    if (scanInFlightRef.current) {
      queuedScanRef.current = true;
      return;
    }

    scanInFlightRef.current = true;
    let cancelled = false;
    let cancelIdle: (() => void) | null = null;

    const finalizeScan = () => {
      scanInFlightRef.current = false;
      if (queuedScanRef.current) {
        queuedScanRef.current = false;
        runMissingAssetsScan();
      }
    };

    const runBatchedScan = async (cards: CardRecord[]) => {
      const reports: MissingAssetReport[] = [];
      let index = 0;

      const processNextBatch = async () => {
        if (cancelled) return;
        const chunk = cards.slice(index, index + SCAN_BATCH_SIZE);
        if (!chunk.length) {
          setMissingAssetsReport(reports);
          finalizeScan();
          return;
        }

        const assetIds = chunk.flatMap((card) => {
          const ids: string[] = [];
          if (card.imageAssetId) ids.push(card.imageAssetId);
          if (card.monsterIconAssetId) ids.push(card.monsterIconAssetId);
          return ids;
        });

        try {
          const { missing } = await buildAssetCache(assetIds);

          chunk.forEach((card) => {
            const missingAssets: MissingAssetReport["missing"] = [];
            if (card.imageAssetId && missing.has(card.imageAssetId)) {
              missingAssets.push({
                label: "image",
                id: card.imageAssetId,
                name: card.imageAssetName ?? "unknown",
              });
            }
            if (card.monsterIconAssetId && missing.has(card.monsterIconAssetId)) {
              missingAssets.push({
                label: "icon",
                id: card.monsterIconAssetId,
                name: card.monsterIconAssetName ?? "unknown",
              });
            }
            if (missingAssets.length > 0) {
              reports.push({
                cardId: card.id,
                title: card.title ?? card.name ?? "Untitled",
                templateId: card.templateId,
                face: card.face ?? "unknown",
                thumbnailBlob: card.thumbnailBlob ?? null,
                missing: missingAssets,
              });
            }
          });
        } catch {
          // Ignore batch failures.
        }

        index += SCAN_BATCH_SIZE;
        cancelIdle = scheduleIdle(() => {
          void processNextBatch();
        });
      };

      cancelIdle = scheduleIdle(() => {
        void processNextBatch();
      });
    };

    cancelIdle = scheduleIdle(() => {
      void (async () => {
        try {
          const cards = await apiClient.listCards();
          if (cancelled) return;
          await runBatchedScan(cards);
        } catch {
          // Ignore scan failures.
          finalizeScan();
        } finally {
          // finalizeScan is called when batches complete.
        }
      })();
    });

    return () => {
      cancelled = true;
      cancelIdle?.();
    };
  }, []);

  const disabledValue = useMemo<MissingAssetsContextValue>(
    () => ({
      missingAssetsReport: [],
      missingArtworkIds: new Set(),
      runMissingAssetsScan: () => {},
    }),
    [],
  );

  useEffect(() => {
    if (!ENABLE_MISSING_ASSET_CHECKS) return;

    if (ENABLE_MISSING_ASSET_INITIAL_SCAN) {
      runMissingAssetsScan("initial");
    }

    if (!ENABLE_MISSING_ASSET_PERIODIC_SCAN) return;

    const intervalId = window.setInterval(() => {
      runMissingAssetsScan("periodic");
    }, SCAN_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [runMissingAssetsScan]);

  const value = useMemo<MissingAssetsContextValue>(
    () =>
      ENABLE_MISSING_ASSET_CHECKS
        ? {
            missingAssetsReport,
            missingArtworkIds,
            runMissingAssetsScan,
          }
        : disabledValue,
    [disabledValue, missingAssetsReport, missingArtworkIds, runMissingAssetsScan],
  );

  return <MissingAssetsContext.Provider value={value}>{children}</MissingAssetsContext.Provider>;
}

export function useMissingAssets(): MissingAssetsContextValue {
  const ctx = useContext(MissingAssetsContext);
  if (!ctx) {
    throw new Error("useMissingAssets must be used within a MissingAssetsProvider");
  }
  return ctx;
}
