"use client";

import { encode as encodeMsgpack } from "@msgpack/msgpack";

import { USE_ZIP_COMPRESSION } from "@/config/flags";
import type { AssetRecord } from "@/api/assets";
import type { CardRecord } from "@/types/cards-db";
import type {
  DeckEntryRecord,
  DeckGroupRecord,
  DeckRecord,
  DeckSetRecord,
} from "@/types/decks-db";
import type { PairRecord } from "@/types/pairs-db";

import { DEFAULT_BACKUP_FORMAT, type BackupContainerFormat } from "../backup-formats";
import { createZipBlobWithProgress } from "../zip-utils";
import { listCards } from "../cards-db";
import {
  BACKUP_CONTAINER_EXTENSION,
  BACKUP_FILE_EXTENSION,
  BACKUP_SCHEMA_VERSION,
  type AssetRecordExportCompactV1,
  type AssetRecordExportV1,
  type BackupProgressCallback,
  type BackupSecondaryProgressCallback,
  type BackupStatusCallback,
  type CardRecordExportCompactV1,
  type CardRecordExportV1,
  type CollectionRecordExportV1,
  type ExportResult,
  type HqccExportCompactFileV1,
  type HqccExportFileV1,
  type HqccExportLocalStorageV1,
  type HqccExportSettingsV1,
} from "./backup-types";
import {
  BACKUP_LEGACY_FILENAME,
  BACKUP_MANIFEST_FILENAME,
  BACKUP_METADATA_FILENAME_V2,
  COMPACT_CONTAINER_VERSION,
  COMPACT_PAYLOAD_ID_V2,
  buildObfuscatedBlobRef,
} from "./backup-compact-container";
import { blobToDataUrl } from "./backup-blob-codec";
import { validateDeckReferences } from "./backup-validation";

function buildTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return (
    [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join("") +
    "-" +
    [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join("")
  );
}

function buildExportMeta(input: {
  cards: { length: number };
  assets: { length: number };
  collections?: { length: number } | null;
  decks?: { length: number } | null;
  deckGroups?: { length: number } | null;
  deckSets?: { length: number } | null;
  deckEntries?: { length: number } | null;
}): ExportResult["meta"] {
  return {
    cardsCount: input.cards.length,
    assetsCount: input.assets.length,
    collectionsCount: input.collections?.length ?? 0,
    decksCount: input.decks?.length ?? 0,
    deckGroupsCount: input.deckGroups?.length ?? 0,
    deckSetsCount: input.deckSets?.length ?? 0,
    deckEntriesCount: input.deckEntries?.length ?? 0,
  };
}

async function loadExportInputs(): Promise<{
  rawCards: CardRecord[];
  rawAssets: (AssetRecord & { blob?: Blob | null })[];
  collections: CollectionRecordExportV1[];
  pairs: PairRecord[];
  decks: DeckRecord[];
  deckGroups: DeckGroupRecord[];
  deckSets: DeckSetRecord[];
  deckEntries: DeckEntryRecord[];
  settings?: HqccExportSettingsV1;
  localStorage: HqccExportLocalStorageV1;
}> {
  if (typeof window === "undefined") {
    throw new Error("Backup export is only available in the browser");
  }
  const { apiClient } = await import("@/api/client");
  const [
    rawCards,
    rawAssets,
    collections,
    pairs,
    decks,
    deckGroupsByDeck,
    deckSetsByDeck,
    deckEntriesBySet,
    borderSwatches,
    defaultCopyright,
  ] = await Promise.all([
    listCards({ deleted: "include" }),
    apiClient.listAssetsWithBlobs(),
    apiClient.listCollections(),
    apiClient.listPairs(),
    apiClient.listDecks({ queries: {} }),
    Promise.resolve(new Map<string, DeckGroupRecord[]>()),
    Promise.resolve(new Map<string, DeckSetRecord[]>()),
    Promise.resolve(new Map<string, DeckEntryRecord[]>()),
    apiClient.getBorderSwatches(),
    apiClient.getDefaultCopyright(),
  ]);

  await Promise.all(
    decks.map(async (deck) => {
      const groups = await apiClient.listDeckGroups({ params: { deckId: deck.id } });
      deckGroupsByDeck.set(deck.id, groups);
      const sets = await apiClient.listDeckSets({ params: { deckId: deck.id } });
      deckSetsByDeck.set(deck.id, sets);
      await Promise.all(
        sets.map(async (set) => {
          const entries = await apiClient.listDeckEntries({ params: { setId: set.id } });
          deckEntriesBySet.set(set.id, entries);
        }),
      );
    }),
  );
  const deckGroups = Array.from(deckGroupsByDeck.values()).flat();
  const deckSets = Array.from(deckSetsByDeck.values()).flat();
  const deckEntries = Array.from(deckEntriesBySet.values()).flat();

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

  return {
    rawCards,
    rawAssets,
    collections: collections as CollectionRecordExportV1[],
    pairs: pairs as PairRecord[],
    decks: decks as DeckRecord[],
    deckGroups: deckGroups as DeckGroupRecord[],
    deckSets: deckSets as DeckSetRecord[],
    deckEntries: deckEntries as DeckEntryRecord[],
    settings,
    localStorage,
  };
}

async function buildLegacyExportObject(
  onProgress?: BackupProgressCallback,
): Promise<HqccExportFileV1> {
  const {
    rawCards,
    rawAssets,
    collections,
    pairs,
    decks,
    deckGroups,
    deckSets,
    deckEntries,
    settings,
    localStorage,
  } = await loadExportInputs();
  const deckValidation = validateDeckReferences({
    cards: rawCards,
    pairs,
    decks,
    deckGroups,
    deckSets,
    deckEntries,
  });
  if (!deckValidation.valid) {
    throw new Error("Deck integrity check failed: unresolved deck references");
  }

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
    const { blob, ...rest } = value as AssetRecord & { blob?: Blob | null };

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

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    cards,
    assets,
    ...(pairs ? { pairs: pairs as PairRecord[] } : {}),
    collections,
    decks,
    deckGroups,
    deckSets,
    deckEntries,
    settings,
    localStorage,
  };
}

async function buildCompactExportBundle(
  onProgress?: BackupProgressCallback,
): Promise<{
  metadata: HqccExportCompactFileV1;
  files: { name: string; data: Blob | string }[];
}> {
  const {
    rawCards,
    rawAssets,
    collections,
    pairs,
    decks,
    deckGroups,
    deckSets,
    deckEntries,
    settings,
    localStorage,
  } = await loadExportInputs();
  const deckValidation = validateDeckReferences({
    cards: rawCards,
    pairs,
    decks,
    deckGroups,
    deckSets,
    deckEntries,
  });
  if (!deckValidation.valid) {
    throw new Error("Deck integrity check failed: unresolved deck references");
  }

  const cards: CardRecordExportCompactV1[] = [];
  const assets: AssetRecordExportCompactV1[] = [];
  const files: { name: string; data: Blob | string }[] = [];

  const totalProgressCount = rawCards.length + rawAssets.length;
  let processedCount = 0;

  for (const value of rawCards) {
    const { thumbnailBlob, ...rest } = value;
    const exportRecord: CardRecordExportCompactV1 = {
      ...rest,
    };

    if (thumbnailBlob instanceof Blob) {
      const ref = buildObfuscatedBlobRef("thumb", value.id);
      exportRecord.thumbnailRef = ref;
      exportRecord.thumbnailMimeType = thumbnailBlob.type || null;
      files.push({ name: ref, data: thumbnailBlob });
    }

    cards.push(exportRecord);
    processedCount += 1;
    onProgress?.(processedCount, totalProgressCount, "export");
  }

  for (const value of rawAssets) {
    const { blob, ...rest } = value as AssetRecord & { blob?: Blob | null };
    if (blob instanceof Blob) {
      const ref = buildObfuscatedBlobRef("asset", rest.id);
      assets.push({
        ...rest,
        blobRef: ref,
      });
      files.push({ name: ref, data: blob });
    }
    processedCount += 1;
    onProgress?.(processedCount, totalProgressCount, "export");
  }

  if (totalProgressCount > 0) {
    onProgress?.(totalProgressCount, totalProgressCount, "export");
  }

  const metadata: HqccExportCompactFileV1 = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    cards,
    assets,
    ...(pairs ? { pairs: pairs as PairRecord[] } : {}),
    collections,
    decks,
    deckGroups,
    deckSets,
    deckEntries,
    settings,
    localStorage,
  };

  const manifest = {
    format: "hqcc-backup",
    containerVersion: COMPACT_CONTAINER_VERSION,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    payload: COMPACT_PAYLOAD_ID_V2,
  };

  const metadataBytes = encodeMsgpack(metadata, { ignoreUndefined: true });

  return {
    metadata,
    files: [
      { name: BACKUP_MANIFEST_FILENAME, data: JSON.stringify(manifest, null, 2) },
      {
        name: BACKUP_METADATA_FILENAME_V2,
        data: new Blob([metadataBytes], { type: "application/octet-stream" }),
      },
      ...files,
    ],
  };
}

export async function createBackupJson(options?: {
  onProgress?: BackupProgressCallback;
  onStatus?: BackupStatusCallback;
  onSecondaryProgress?: BackupSecondaryProgressCallback;
}): Promise<ExportResult> {
  options?.onStatus?.("processing");
  const exportObject = await buildLegacyExportObject(options?.onProgress);

  const json = JSON.stringify(exportObject, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  return {
    blob,
    fileName: `heroquest-card-maker-backup-${buildTimestamp()}${BACKUP_FILE_EXTENSION}`,
    meta: buildExportMeta({
      cards: exportObject.cards,
      assets: exportObject.assets,
      collections: exportObject.collections,
      decks: exportObject.decks,
      deckGroups: exportObject.deckGroups,
      deckSets: exportObject.deckSets,
      deckEntries: exportObject.deckEntries,
    }),
  };
}

export async function createBackupHqcc(options?: {
  onProgress?: BackupProgressCallback;
  onStatus?: BackupStatusCallback;
  onSecondaryProgress?: BackupSecondaryProgressCallback;
  onSecondaryStatus?: (mode: "worker" | "fallback") => void;
  format?: BackupContainerFormat;
}): Promise<ExportResult> {
  options?.onStatus?.("processing");
  const format = options?.format ?? DEFAULT_BACKUP_FORMAT;
  const isCompact = format === "compact-zip-v1";
  const legacyExport = isCompact ? null : await buildLegacyExportObject(options?.onProgress);
  const compactExport = isCompact ? await buildCompactExportBundle(options?.onProgress) : null;

  options?.onStatus?.("finalizing");
  await new Promise((resolve) => setTimeout(resolve, 250));
  const blob = await createZipBlobWithProgress({
    files:
      isCompact && compactExport
        ? compactExport.files
        : [
            {
              name: BACKUP_LEGACY_FILENAME,
              data: JSON.stringify(legacyExport, null, 2),
            },
          ],
    compress: USE_ZIP_COMPRESSION,
    onProgress: (percent) => options?.onSecondaryProgress?.(percent ?? 0, "finalizing"),
    onStatus: (mode) => options?.onSecondaryStatus?.(mode),
  });

  const exportMetaSource = isCompact ? compactExport?.metadata : legacyExport;

  return {
    blob,
    fileName: `heroquest-card-maker-backup-${buildTimestamp()}${BACKUP_CONTAINER_EXTENSION}`,
    meta: buildExportMeta({
      cards: exportMetaSource?.cards ?? [],
      assets: exportMetaSource?.assets ?? [],
      collections: exportMetaSource?.collections,
      decks: exportMetaSource?.decks,
      deckGroups: exportMetaSource?.deckGroups,
      deckSets: exportMetaSource?.deckSets,
      deckEntries: exportMetaSource?.deckEntries,
    }),
  };
}
