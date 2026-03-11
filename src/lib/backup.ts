"use client";

import { BlobReader, TextWriter, ZipReader } from "@zip.js/zip.js";

import { USE_ZIP_COMPRESSION } from "@/config/flags";
import { configureZipJs } from "@/lib/zip-config";
import { createZipBlobWithProgress } from "@/lib/zip-utils";
import type { AssetRecord } from "@/api/assets";
import type { CardRecord } from "@/types/cards-db";
import type { PairRecord } from "@/types/pairs-db";

import { generateId } from ".";

export const BACKUP_SCHEMA_VERSION = 2 as const;
export const BACKUP_FILE_EXTENSION = ".hqcc.json" as const;
export const BACKUP_CONTAINER_EXTENSION = ".hqcc" as const;

export type HqccExportSchemaVersion = 1 | 2;

export type CardRecordExportV1 = Omit<CardRecord, "thumbnailBlob"> & {
  thumbnailDataUrl?: string | null;
  pairedWith?: string | null;
};

export type AssetRecordExportV1 = AssetRecord & {
  dataUrl: string;
};

export interface CollectionRecordExportV1 {
  id: string;
  name: string;
  nameLower: string;
  createdAt: number;
  updatedAt: number;
  schemaVersion: 1;
  cardIds?: string[];
  templateId?: string | null;
  statusFilter?: "draft" | "saved" | "archived" | null;
}

export interface HqccExportLocalStorageV1 {
  draftV1?: string | null;
  draftTemplateIdV1?: string | null;
  activeCardsV1?: string | null;
  statLabels?: string | null;
  exportBleedEnabled?: string | null;
  exportBleedPx?: string | null;
  exportAskBeforeExport?: string | null;
  exportCropMarksEnabled?: string | null;
  exportCropMarksColor?: string | null;
  exportCropMarksStyle?: string | null;
  exportCutMarksEnabled?: string | null;
  exportCutMarksColor?: string | null;
  exportRoundedCorners?: string | null;
}

export interface HqccExportSettingsV1 {
  borderSwatches?: string[];
  defaultCopyright?: string;
}

export interface HqccExportFileV1 {
  schemaVersion: HqccExportSchemaVersion;
  createdAt: string;
  appVersion?: string;
  notes?: string;
  cards: CardRecordExportV1[];
  assets: AssetRecordExportV1[];
  pairs?: PairRecord[];
  collections?: CollectionRecordExportV1[];
  settings?: HqccExportSettingsV1;
  localStorage: HqccExportLocalStorageV1;
}

export type ExportResult = {
  blob: Blob;
  fileName: string;
  meta: {
    cardsCount: number;
    assetsCount: number;
    collectionsCount: number;
  };
};

export type ImportResult = {
  cardsCount: number;
  assetsCount: number;
  collectionsCount: number;
};

export type BackupProgressPhase = "export" | "import";
export type BackupProgressCallback = (
  current: number,
  total: number,
  phase: BackupProgressPhase,
) => void;
export type BackupStatusPhase = "preparing" | "processing" | "finalizing";
export type BackupStatusCallback = (phase: BackupStatusPhase) => void;
export type BackupSecondaryProgressCallback = (percent: number, phase: BackupStatusPhase) => void;

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read blob as data URL"));
    };

    reader.onload = () => {
      const { result } = reader;
      if (typeof result !== "string") {
        reject(new Error("Unexpected FileReader result type"));
        return;
      }
      resolve(result);
    };

    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  if (!dataUrl.startsWith("data:")) {
    throw new Error("Invalid data URL: missing data: prefix");
  }

  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) {
    throw new Error("Invalid data URL: missing comma separator");
  }

  const meta = dataUrl.slice(5, commaIndex); // after "data:"
  const payload = dataUrl.slice(commaIndex + 1);

  const parts = meta.split(";");
  const mimeType = parts[0] || "application/octet-stream";
  const isBase64 = parts.includes("base64");

  let binaryString: string;
  try {
    if (isBase64) {
      binaryString = atob(payload);
    } else {
      binaryString = decodeURIComponent(payload);
    }
  } catch {
    throw new Error("Invalid data URL: failed to decode payload");
  }

  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

function parseBackupJson(text: string): HqccExportFileV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This file is not a valid HeroQuest Card Maker backup");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("This file is not a valid HeroQuest Card Maker backup");
  }

  const candidate = parsed as Partial<HqccExportFileV1>;

  if (typeof candidate.schemaVersion !== "number") {
    throw new Error("This file is not a valid HeroQuest Card Maker backup");
  }

  if (candidate.schemaVersion !== 1 && candidate.schemaVersion !== 2) {
    throw new Error("This backup was created by an incompatible version of the app");
  }

  if (!Array.isArray(candidate.cards) || !Array.isArray(candidate.assets)) {
    throw new Error("This file is not a valid HeroQuest Card Maker backup");
  }

  if (!candidate.localStorage || typeof candidate.localStorage !== "object") {
    throw new Error("This file is not a valid HeroQuest Card Maker backup");
  }

  return candidate as HqccExportFileV1;
}

async function buildExportObject(onProgress?: BackupProgressCallback): Promise<HqccExportFileV1> {
  if (typeof window === "undefined") {
    throw new Error("Backup export is only available in the browser");
  }
  const { apiClient } = await import("@/api/client");
  const [
    rawCards,
    rawAssets,
    collections,
    pairs,
    borderSwatches,
    defaultCopyright,
  ] = await Promise.all([
    apiClient.listCards({ queries: { deleted: "include" } }),
    apiClient.listAssetsWithBlobs(),
    apiClient.listCollections(),
    apiClient.listPairs(),
    apiClient.getBorderSwatches(),
    apiClient.getDefaultCopyright(),
  ]);

  const cards: CardRecordExportV1[] = [];
  const totalProgressCount = rawCards.length + rawAssets.length;
  let processedCount = 0;
  for (const value of rawCards) {
    const { thumbnailBlob, ...rest } = value;
    const exportRecord: CardRecordExportV1 = {
      ...rest,
    };

    if (thumbnailBlob instanceof Blob) {
      try {
        exportRecord.thumbnailDataUrl = await blobToDataUrl(thumbnailBlob);
      } catch {
        // Ignore thumbnail encoding errors; continue without thumbnail
      }
    }

    cards.push(exportRecord);
    processedCount += 1;
    onProgress?.(processedCount, totalProgressCount, "export");
  }

  const assets: AssetRecordExportV1[] = [];
  for (const value of rawAssets) {
    const { blob, ...rest } = value;

    if (blob instanceof Blob) {
      try {
        const dataUrl = await blobToDataUrl(blob);
        assets.push({
          ...rest,
          dataUrl,
        });
      } catch {
        // Ignore individual asset encoding errors; continue with others
      }
    }
    processedCount += 1;
    onProgress?.(processedCount, totalProgressCount, "export");
  }

  if (totalProgressCount > 0) {
    onProgress?.(totalProgressCount, totalProgressCount, "export");
  }

  let settings: HqccExportSettingsV1 | undefined;
  const hasBorderSwatches = Array.isArray(borderSwatches) && borderSwatches.length > 0;
  const hasDefaultCopyright =
    typeof defaultCopyright === "string" && defaultCopyright.trim().length > 0;
  if (hasBorderSwatches || hasDefaultCopyright) {
    settings = {
      ...(hasBorderSwatches ? { borderSwatches } : {}),
      ...(hasDefaultCopyright ? { defaultCopyright } : {}),
    };
  }

  let draftV1: string | null | undefined;
  let draftTemplateIdV1: string | null | undefined;
  let activeCardsV1: string | null | undefined;
  let statLabels: string | null | undefined;
  let exportBleedEnabled: string | null | undefined;
  let exportBleedPx: string | null | undefined;
  let exportAskBeforeExport: string | null | undefined;
  let exportCropMarksEnabled: string | null | undefined;
  let exportCropMarksColor: string | null | undefined;
  let exportCropMarksStyle: string | null | undefined;
  let exportCutMarksEnabled: string | null | undefined;
  let exportCutMarksColor: string | null | undefined;
  let exportRoundedCorners: string | null | undefined;

  try {
    draftV1 = window.localStorage.getItem("hqcc.draft.v1");
  } catch {
    draftV1 = undefined;
  }

  try {
    draftTemplateIdV1 = window.localStorage.getItem("hqcc.draftTemplateId.v1");
  } catch {
    draftTemplateIdV1 = undefined;
  }

  try {
    activeCardsV1 = window.localStorage.getItem("hqcc.activeCards.v1");
  } catch {
    activeCardsV1 = undefined;
  }

  try {
    statLabels = window.localStorage.getItem("hqcc.statLabels");
  } catch {
    statLabels = undefined;
  }

  try {
    exportBleedEnabled = window.localStorage.getItem("hqcc.exportPng.bleedEnabled");
  } catch {
    exportBleedEnabled = undefined;
  }

  try {
    exportBleedPx = window.localStorage.getItem("hqcc.exportPng.bleedPx");
  } catch {
    exportBleedPx = undefined;
  }

  try {
    exportAskBeforeExport = window.localStorage.getItem("hqcc.exportPng.askBeforeExport");
  } catch {
    exportAskBeforeExport = undefined;
  }

  try {
    exportCropMarksEnabled = window.localStorage.getItem("hqcc.exportPng.cropMarksEnabled");
  } catch {
    exportCropMarksEnabled = undefined;
  }

  try {
    exportCropMarksColor = window.localStorage.getItem("hqcc.exportPng.cropMarksColor");
  } catch {
    exportCropMarksColor = undefined;
  }
  try {
    exportCropMarksStyle = window.localStorage.getItem("hqcc.exportPng.cropMarksStyle");
  } catch {
    exportCropMarksStyle = undefined;
  }
  try {
    exportCutMarksEnabled = window.localStorage.getItem("hqcc.exportPng.cutMarksEnabled");
  } catch {
    exportCutMarksEnabled = undefined;
  }
  try {
    exportCutMarksColor = window.localStorage.getItem("hqcc.exportPng.cutMarksColor");
  } catch {
    exportCutMarksColor = undefined;
  }
  try {
    exportRoundedCorners = window.localStorage.getItem("hqcc.exportPng.roundedCorners");
  } catch {
    exportRoundedCorners = undefined;
  }

  const localStorage: HqccExportLocalStorageV1 = {
    draftV1,
    draftTemplateIdV1,
    activeCardsV1,
    statLabels,
    exportBleedEnabled,
    exportBleedPx,
    exportAskBeforeExport,
    exportCropMarksEnabled,
    exportCropMarksColor,
    exportCropMarksStyle,
    exportCutMarksEnabled,
    exportCutMarksColor,
    exportRoundedCorners,
  };

  const exportObject: HqccExportFileV1 = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    cards,
    assets,
    ...(pairs ? { pairs: pairs as PairRecord[] } : {}),
    collections: collections as CollectionRecordExportV1[],
    settings,
    localStorage,
  };

  return exportObject;
}

async function applyBackupObject(
  exportData: HqccExportFileV1,
  onProgress?: BackupProgressCallback,
): Promise<ImportResult> {
  if (exportData.schemaVersion !== 1 && exportData.schemaVersion !== 2) {
    throw new Error("Incompatible backup version");
  }

  if (!Array.isArray(exportData.cards) || !Array.isArray(exportData.assets)) {
    throw new Error("Invalid backup file structure");
  }

  if (!exportData.localStorage || typeof exportData.localStorage !== "object") {
    throw new Error("Invalid backup file: missing localStorage section");
  }

  if (typeof window === "undefined") {
    throw new Error("Backup import is only available in the browser");
  }

  const { apiClient } = await import("@/api/client");
  const [existingCards, existingAssets, existingCollections, existingPairs] = await Promise.all([
    apiClient.listCards({ queries: { deleted: "include" } }),
    apiClient.listAssets(),
    apiClient.listCollections(),
    apiClient.listPairs(),
  ]);

  if (existingCards.length > 0) {
    await apiClient.deleteCards({ ids: existingCards.map((card) => card.id) });
  }
  if (existingAssets.length > 0) {
    await apiClient.deleteAssets({ ids: existingAssets.map((asset) => asset.id) });
  }
  if (existingCollections.length > 0) {
    await Promise.all(
      existingCollections.map((collection) =>
        apiClient.deleteCollection(undefined, { params: { id: collection.id } }),
      ),
    );
  }
  if (existingPairs.length > 0) {
    await Promise.all(
      existingPairs.map((pair) => {
        if (!pair.frontFaceId || !pair.backFaceId) return Promise.resolve();
        return apiClient.deletePair({
          frontFaceId: pair.frontFaceId,
          backFaceId: pair.backFaceId,
        });
      }),
    );
  }

  let cardsCount = 0;
  let assetsCount = 0;
  let collectionsCount = 0;
  const total =
    exportData.assets.length +
    exportData.cards.length +
    (Array.isArray(exportData.collections) ? exportData.collections.length : 0);

  if (exportData.assets.length > 0) {
    for (const assetExport of exportData.assets) {
      try {
        const { dataUrl, id, ...rest } = assetExport;
        const blob = dataUrlToBlob(dataUrl);
        await apiClient.replaceAsset(
          {
            ...rest,
            blob,
          },
          { params: { id } },
        );
        assetsCount += 1;
        onProgress?.(assetsCount + cardsCount + collectionsCount, total, "import");
      } catch {
        // Skip invalid asset entries
      }
    }
  }

  if (exportData.cards.length > 0) {
    for (const cardExport of exportData.cards) {
      let thumbnailBlob: Blob | null = null;
      if (cardExport.thumbnailDataUrl) {
        try {
          thumbnailBlob = dataUrlToBlob(cardExport.thumbnailDataUrl);
        } catch {
          thumbnailBlob = null;
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { thumbnailDataUrl, pairedWith, ...rest } = cardExport as CardRecordExportV1;
      const record: CardRecord = {
        ...(rest as CardRecord),
        thumbnailBlob,
      };
      await apiClient.createCard(record);
      cardsCount += 1;
      onProgress?.(assetsCount + cardsCount + collectionsCount, total, "import");
    }
  }

  if (Array.isArray(exportData.collections) && exportData.collections.length) {
    for (const collection of exportData.collections) {
      await apiClient.createCollection(collection);
      collectionsCount += 1;
      onProgress?.(assetsCount + cardsCount + collectionsCount, total, "import");
    }
  }

  const borderSwatches = exportData.settings?.borderSwatches ?? [];
  const defaultCopyright = exportData.settings?.defaultCopyright ?? "";
  await Promise.all([
    apiClient.setBorderSwatches({ swatches: borderSwatches }),
    apiClient.setDefaultCopyright({ value: defaultCopyright }),
  ]);

  if (Array.isArray(exportData.pairs) && exportData.pairs.length > 0) {
    await Promise.all(
      exportData.pairs.map((pair) => {
        if (!pair.frontFaceId || !pair.backFaceId) return Promise.resolve();
        return apiClient.createPair({
          frontFaceId: pair.frontFaceId,
          backFaceId: pair.backFaceId,
          id: pair.id,
          name: pair.name,
          nameLower: pair.nameLower,
          createdAt: pair.createdAt,
          updatedAt: pair.updatedAt,
          schemaVersion: pair.schemaVersion,
        });
      }),
    );
  } else {
    const legacyPairs = exportData.cards
      .filter((card) => card.pairedWith)
      .map((card) => {
        const back = exportData.cards.find((candidate) => candidate.id === card.pairedWith);
        const frontName = card.name ?? card.title ?? "Untitled front";
        const backName = back?.name ?? back?.title ?? "Untitled back";
        return {
          frontFaceId: card.id,
          backFaceId: card.pairedWith as string,
          name: `${frontName} - ${backName}`,
        };
      });
    if (legacyPairs.length > 0) {
      await Promise.all(
        legacyPairs.map((pair) => {
          const now = Date.now();
          return apiClient.createPair({
            frontFaceId: pair.frontFaceId,
            backFaceId: pair.backFaceId,
            id: generateId(),
            name: pair.name,
            nameLower: pair.name.toLocaleLowerCase(),
            createdAt: now,
            updatedAt: now,
            schemaVersion: 1,
          });
        }),
      );
    }
  }

  try {
    const {
      draftV1,
      draftTemplateIdV1,
      activeCardsV1,
      statLabels,
      exportBleedEnabled,
      exportBleedPx,
      exportAskBeforeExport,
      exportCropMarksEnabled,
      exportCropMarksColor,
      exportCropMarksStyle,
      exportCutMarksEnabled,
      exportCutMarksColor,
      exportRoundedCorners,
    } = exportData.localStorage;
    void draftV1;
    void draftTemplateIdV1;
    if (typeof activeCardsV1 === "string") {
      window.localStorage.setItem("hqcc.activeCards.v1", activeCardsV1);
    }
    if (typeof statLabels === "string") {
      window.localStorage.setItem("hqcc.statLabels", statLabels);
    }
    if (typeof exportBleedEnabled === "string") {
      window.localStorage.setItem("hqcc.exportPng.bleedEnabled", exportBleedEnabled);
    }
    if (typeof exportBleedPx === "string") {
      window.localStorage.setItem("hqcc.exportPng.bleedPx", exportBleedPx);
    }
    if (typeof exportAskBeforeExport === "string") {
      window.localStorage.setItem("hqcc.exportPng.askBeforeExport", exportAskBeforeExport);
    }
    if (typeof exportCropMarksEnabled === "string") {
      window.localStorage.setItem("hqcc.exportPng.cropMarksEnabled", exportCropMarksEnabled);
    }
    if (typeof exportCropMarksColor === "string") {
      window.localStorage.setItem("hqcc.exportPng.cropMarksColor", exportCropMarksColor);
    }
    if (typeof exportCropMarksStyle === "string") {
      window.localStorage.setItem("hqcc.exportPng.cropMarksStyle", exportCropMarksStyle);
    }
    if (typeof exportCutMarksEnabled === "string") {
      window.localStorage.setItem("hqcc.exportPng.cutMarksEnabled", exportCutMarksEnabled);
    }
    if (typeof exportCutMarksColor === "string") {
      window.localStorage.setItem("hqcc.exportPng.cutMarksColor", exportCutMarksColor);
    }
    if (typeof exportRoundedCorners === "string") {
      window.localStorage.setItem("hqcc.exportPng.roundedCorners", exportRoundedCorners);
    }
  } catch {
    // Ignore localStorage restore errors
  }

  return {
    cardsCount,
    assetsCount,
    collectionsCount,
  };
}

export async function createBackupJson(options?: {
  onProgress?: BackupProgressCallback;
  onStatus?: BackupStatusCallback;
  onSecondaryProgress?: BackupSecondaryProgressCallback;
}): Promise<ExportResult> {
  options?.onStatus?.("processing");
  const exportObject = await buildExportObject(options?.onProgress);

  const json = JSON.stringify(exportObject, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  const now = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const timestamp =
    [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join("") +
    "-" +
    [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join("");

  const fileName = `heroquest-card-maker-backup-${timestamp}${BACKUP_FILE_EXTENSION}`;

  return {
    blob,
    fileName,
    meta: {
      cardsCount: exportObject.cards.length,
      assetsCount: exportObject.assets.length,
      collectionsCount: Array.isArray(exportObject.collections)
        ? exportObject.collections.length
        : 0,
    },
  };
}

export async function importBackupJson(
  file: File,
  options?: {
    onProgress?: BackupProgressCallback;
    onStatus?: BackupStatusCallback;
    onSecondaryProgress?: BackupSecondaryProgressCallback;
  },
): Promise<ImportResult> {
  options?.onStatus?.("preparing");
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new Error("Could not read the selected backup file");
  }

  const exportData = parseBackupJson(text);

  options?.onStatus?.("processing");
  return applyBackupObject(exportData, options?.onProgress);
}

export async function createBackupHqcc(options?: {
  onProgress?: BackupProgressCallback;
  onStatus?: BackupStatusCallback;
  onSecondaryProgress?: BackupSecondaryProgressCallback;
  onSecondaryStatus?: (mode: "worker" | "fallback") => void;
}): Promise<ExportResult> {
  options?.onStatus?.("processing");
  const exportObject = await buildExportObject(options?.onProgress);
  const json = JSON.stringify(exportObject, null, 2);

  options?.onStatus?.("finalizing");
  await new Promise((resolve) => setTimeout(resolve, 250));
  const blob = await createZipBlobWithProgress({
    files: [{ name: "backup.json", data: json }],
    compress: USE_ZIP_COMPRESSION,
    onProgress: (percent) => options?.onSecondaryProgress?.(percent ?? 0, "finalizing"),
    onStatus: (mode) => options?.onSecondaryStatus?.(mode),
  });

  const now = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const timestamp =
    [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join("") +
    "-" +
    [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join("");

  const fileName = `heroquest-card-maker-backup-${timestamp}${BACKUP_CONTAINER_EXTENSION}`;

  return {
    blob,
    fileName,
    meta: {
      cardsCount: exportObject.cards.length,
      assetsCount: exportObject.assets.length,
      collectionsCount: Array.isArray(exportObject.collections)
        ? exportObject.collections.length
        : 0,
    },
  };
}

export async function importBackupHqcc(
  file: File,
  options?: {
    onProgress?: BackupProgressCallback;
    onStatus?: BackupStatusCallback;
    onSecondaryProgress?: BackupSecondaryProgressCallback;
  },
): Promise<ImportResult> {
  options?.onStatus?.("preparing");
  const readBackupFile = async (useWebWorkers: boolean) => {
    configureZipJs(useWebWorkers);
    let reader: ZipReader<BlobReader> | null = null;
    try {
      reader = new ZipReader(new BlobReader(file));
    } catch {
      throw new Error("This file is not a valid HeroQuest Card Maker backup");
    }

    try {
      const entries = await reader.getEntries();
      const entry = entries.find((zipEntry) => zipEntry.filename === "backup.json");
      if (!entry || entry.directory || !("getData" in entry)) {
        throw new Error("This file is not a valid HeroQuest Card Maker backup");
      }
      return await entry.getData(new TextWriter());
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "This file is not a valid HeroQuest Card Maker backup"
      ) {
        throw error;
      }
      throw new Error("Could not read backup data from this file");
    } finally {
      await reader?.close();
    }
  };

  let text: string;
  try {
    text = await readBackupFile(true);
  } catch {
    text = await readBackupFile(false);
  }

  const exportData = parseBackupJson(text);

  options?.onStatus?.("processing");
  return applyBackupObject(exportData, options?.onProgress);
}
