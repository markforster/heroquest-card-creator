"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

import { hashArrayBufferSha256 } from "@/lib/asset-hash";
import type { AssetRecordWithBlob } from "@/lib/assets-db";
import { getAllAssetsWithBlobs } from "@/lib/assets-db";
import type { UploadScanReport, UploadScanReportItem } from "@/types/asset-duplicates";

import type { ReactNode } from "react";

export type AssetHashIndexStatus = "idle" | "building" | "ready" | "failed";

export type AssetHashIndexProgress = {
  total: number;
  hashed: number;
};

export type ExistingAssetRef = {
  id: string;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  createdAt: number;
  size: number;
};

export type AssetHashIndexContextValue = {
  status: AssetHashIndexStatus;
  progress: AssetHashIndexProgress;
  existingByHash: Map<string, ExistingAssetRef[]>;
  existingNames: Set<string>;
  scanFiles: (files: File[]) => Promise<UploadScanReport>;
  addToIndex: (hash: string, asset: ExistingAssetRef) => void;
  removeFromIndex: (assetIds: string[]) => void;
};

const AssetHashIndexContext = createContext<AssetHashIndexContextValue | undefined>(undefined);

const DEFAULT_BATCH_SIZE = 25;

function toAssetRef(record: AssetRecordWithBlob): ExistingAssetRef {
  return {
    id: record.id,
    name: record.name,
    mimeType: record.mimeType,
    width: record.width,
    height: record.height,
    createdAt: record.createdAt,
    size: record.blob.size,
  };
}

async function yieldToBrowser(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

export function AssetHashIndexProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AssetHashIndexStatus>("idle");
  const [progress, setProgress] = useState<AssetHashIndexProgress>({
    total: 0,
    hashed: 0,
  });
  const [existingByHash, setExistingByHash] = useState<Map<string, ExistingAssetRef[]>>(
    () => new Map(),
  );
  const [existingNames, setExistingNames] = useState<Set<string>>(() => new Set());

  const addToIndex = useCallback((hash: string, asset: ExistingAssetRef) => {
    setExistingByHash((prev) => {
      const next = new Map(prev);
      const bucket = next.get(hash) ?? [];
      next.set(hash, [...bucket, asset]);
      return next;
    });
    setExistingNames((prev) => {
      const next = new Set(prev);
      next.add(asset.name);
      return next;
    });
  }, []);

  const removeFromIndex = useCallback((assetIds: string[]) => {
    if (assetIds.length === 0) return;
    const idSet = new Set(assetIds);

    setExistingByHash((prev) => {
      const next = new Map<string, ExistingAssetRef[]>();
      const nextNames = new Set<string>();
      prev.forEach((bucket, hash) => {
        const filtered = bucket.filter((asset) => !idSet.has(asset.id));
        if (filtered.length > 0) {
          next.set(hash, filtered);
          filtered.forEach((asset) => {
            nextNames.add(asset.name);
          });
        }
      });
      setExistingNames(nextNames);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const buildIndex = async () => {
      setStatus("building");
      setProgress({ total: 0, hashed: 0 });
      try {
        const records = await getAllAssetsWithBlobs();
        if (cancelled) return;

        const total = records.length;
        const nextExistingByHash = new Map<string, ExistingAssetRef[]>();
        const nextExistingNames = new Set<string>();
        let hashed = 0;

        setProgress({ total, hashed: 0 });
        for (let i = 0; i < records.length; i += DEFAULT_BATCH_SIZE) {
          const batch = records.slice(i, i + DEFAULT_BATCH_SIZE);

          for (const record of batch) {
            if (!record.blob) continue;
            const buffer = await record.blob.arrayBuffer();
            const hash = await hashArrayBufferSha256(buffer);
            const ref = toAssetRef(record);
            const bucket = nextExistingByHash.get(hash) ?? [];
            bucket.push(ref);
            nextExistingByHash.set(hash, bucket);
            nextExistingNames.add(record.name);
            hashed += 1;
            if (cancelled) return;
          }

          setProgress({ total, hashed });
          if (i + DEFAULT_BATCH_SIZE < records.length) {
            await yieldToBrowser();
          }
        }

        if (!cancelled) {
          setExistingByHash(nextExistingByHash);
          setExistingNames(nextExistingNames);
          setStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.error("[asset-hash-index] Failed to build index", error);
          setStatus("failed");
        }
      }
    };

    buildIndex();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AssetHashIndexContextValue>(
    () => ({
      status,
      progress,
      existingByHash,
      existingNames,
      scanFiles: async (files: File[]) => {
        const items: UploadScanReportItem[] = [];
        const newByHash = new Map<string, number[]>();
        const hashedFiles: Array<{ file: File; hash: string; index: number }> = [];

        for (let index = 0; index < files.length; index++) {
          const file = files[index];
          try {
            const buffer = await file.arrayBuffer();
            const hash = await hashArrayBufferSha256(buffer);
            hashedFiles.push({ file, hash, index });
            const bucket = newByHash.get(hash) ?? [];
            bucket.push(index);
            newByHash.set(hash, bucket);
          } catch (error) {
            items.push({
              fileIndex: index,
              file,
              hash: null,
              status: "error",
              recommendedAction: "skip",
              error: error instanceof Error ? error.message : "Failed to hash file",
            });
          }
        }

        for (const { file, hash, index } of hashedFiles) {
          const existingMatches = existingByHash.get(hash) ?? [];
          const batchMatches = newByHash.get(hash) ?? [];
          const hasDuplicateInBatch = batchMatches.length > 1;
          const hasNameCollision = existingNames.has(file.name) && existingMatches.length === 0;

          let status: UploadScanReportItem["status"] = "unique";
          let recommendedAction: UploadScanReportItem["recommendedAction"] = "keep";

          if (existingMatches.length > 0) {
            status = "duplicate-existing";
            recommendedAction = "skip";
          } else if (hasDuplicateInBatch) {
            status = "duplicate-batch";
            recommendedAction = "skip";
          } else if (hasNameCollision) {
            status = "name-collision";
            recommendedAction = "rename";
          }

          items.push({
            fileIndex: index,
            file,
            hash,
            status,
            matches:
              existingMatches.length > 0 || hasDuplicateInBatch
                ? {
                    existingAssets: existingMatches.length > 0 ? existingMatches : undefined,
                    batchIndices: hasDuplicateInBatch ? batchMatches : undefined,
                  }
                : undefined,
            recommendedAction,
          });
        }

        return { items };
      },
      addToIndex,
      removeFromIndex,
    }),
    [status, progress, existingByHash, existingNames, addToIndex, removeFromIndex],
  );

  return <AssetHashIndexContext.Provider value={value}>{children}</AssetHashIndexContext.Provider>;
}

export function useAssetHashIndexContext(): AssetHashIndexContextValue {
  const ctx = useContext(AssetHashIndexContext);
  if (!ctx) {
    throw new Error("useAssetHashIndexContext must be used within AssetHashIndexProvider");
  }
  return ctx;
}
