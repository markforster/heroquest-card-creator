"use client";

import type { ExistingAssetRef } from "@/components/Assets/AssetHashIndexProvider";

export type UploadScanStatus =
  | "unique"
  | "duplicate-existing"
  | "duplicate-batch"
  | "name-collision"
  | "error";

export type UploadRecommendedAction = "skip" | "keep" | "rename" | "replace";

export type UploadScanMatch = {
  existingAssets?: ExistingAssetRef[];
  batchIndices?: number[];
};

export type UploadScanReportItem = {
  fileIndex: number;
  file: File;
  hash: string | null;
  status: UploadScanStatus;
  matches?: UploadScanMatch;
  recommendedAction: UploadRecommendedAction;
  error?: string;
};

export type UploadScanReport = {
  items: UploadScanReportItem[];
};
