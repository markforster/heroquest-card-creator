"use client";

import { BlobReader, BlobWriter, TextWriter, Uint8ArrayWriter, ZipReader } from "@zip.js/zip.js";
import { decode as decodeMsgpack } from "@msgpack/msgpack";

import { configureZipJs } from "@/lib/zip-config";
import type { CardRecord } from "@/types/cards-db";
import type { PairRecord } from "@/types/pairs-db";

import { generateId } from "..";
import type {
  BackupProgressCallback,
  BackupSecondaryProgressCallback,
  BackupStatusCallback,
  CardRecordExportCompactV1,
  CardRecordExportV1,
  HqccExportCompactFileV1,
  HqccExportFileV1,
  ImportResult,
} from "./backup-types";
import {
  BACKUP_LEGACY_FILENAME,
  BACKUP_MANIFEST_FILENAME,
  BACKUP_METADATA_FILENAME_V1,
  BACKUP_METADATA_FILENAME_V2,
  COMPACT_PAYLOAD_ID_V1,
  COMPACT_PAYLOAD_ID_V2,
  isValidObfuscatedBlobRef,
} from "./backup-compact-container";
import { dataUrlToBlob } from "./backup-blob-codec";
import {
  parseBackupJson,
  parseBackupMetadata,
  restoreDeckHierarchyAtomic,
  stripNulls,
  validateCompactBackupObject,
  validateDeckReferences,
} from "./backup-validation";

type ZipEntry = { filename: string; directory?: boolean; getData?: Function };

async function clearExistingLibrary() {
  const { apiClient } = await import("@/api/client");
  const [existingCards, existingAssets, existingCollections, existingPairs, existingDecks] =
    await Promise.all([
      apiClient.listCards({ queries: { deleted: "include" } }),
      apiClient.listAssets(),
      apiClient.listCollections(),
      apiClient.listPairs(),
      apiClient.listDecks({ queries: {} }),
    ]);

  if (existingCards.length > 0) {
    await apiClient.deleteCards({
      ids: existingCards.map((card) => card.id),
      mode: "confirmable-cascade",
      confirmCascade: true,
    });
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
  if (existingDecks.length > 0) {
    await Promise.all(
      existingDecks.map((deck) => apiClient.deleteDeck(undefined, { params: { deckId: deck.id } })),
    );
  }
  if (existingPairs.length > 0) {
    await Promise.all(
      existingPairs.map((pair) => {
        if (!pair.frontFaceId || !pair.backFaceId) return Promise.resolve();
        return apiClient.deletePair({
          frontFaceId: pair.frontFaceId,
          backFaceId: pair.backFaceId,
          mode: "confirmable-cascade",
          confirmCascade: true,
        });
      }),
    );
  }

  return { apiClient };
}

async function restorePairs(
  exportCards: Array<{ id: string; pairedWith?: string | null; name?: string | null; title?: string | null }>,
  exportPairs: PairRecord[] | undefined,
  apiClient: (typeof import("@/api/client"))["apiClient"],
) {
  if (Array.isArray(exportPairs) && exportPairs.length > 0) {
    await Promise.all(
      exportPairs.map((pair) => {
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
    return;
  }

  const legacyPairs = exportCards
    .filter((card) => card.pairedWith)
    .map((card) => {
      const back = exportCards.find((candidate) => candidate.id === card.pairedWith);
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

function restoreLocalStorage(localStorage: HqccExportFileV1["localStorage"]) {
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
      exportCutMarksStyle,
      exportRoundedCorners,
    } = localStorage;
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
    if (typeof exportCutMarksStyle === "string") {
      window.localStorage.setItem("hqcc.exportPng.cutMarksStyle", exportCutMarksStyle);
    }
    if (typeof exportRoundedCorners === "string") {
      window.localStorage.setItem("hqcc.exportPng.roundedCorners", exportRoundedCorners);
    }
  } catch {
    // Ignore localStorage restore errors
  }
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

  const { apiClient } = await clearExistingLibrary();

  let cardsCount = 0;
  let assetsCount = 0;
  let collectionsCount = 0;
  let decksCount = 0;
  let deckGroupsCount = 0;
  let deckSetsCount = 0;
  let deckEntriesCount = 0;
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

      const { thumbnailDataUrl, pairedWith, ...rest } = cardExport as CardRecordExportV1;
      void pairedWith;
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

  await restorePairs(exportData.cards, exportData.pairs, apiClient);

  const decks = Array.isArray(exportData.decks) ? exportData.decks : [];
  const deckGroups = Array.isArray(exportData.deckGroups) ? exportData.deckGroups : [];
  const deckSets = Array.isArray(exportData.deckSets) ? exportData.deckSets : [];
  const deckEntries = Array.isArray(exportData.deckEntries) ? exportData.deckEntries : [];
  if (decks.length || deckGroups.length || deckSets.length || deckEntries.length) {
    const validation = validateDeckReferences({
      cards: exportData.cards as CardRecord[],
      pairs: Array.isArray(exportData.pairs) ? exportData.pairs : [],
      decks,
      deckGroups,
      deckSets,
      deckEntries,
    });
    if (!validation.valid) {
      throw new Error("Invalid backup file: unresolved deck references");
    }
    await restoreDeckHierarchyAtomic({ decks, deckGroups, deckSets, deckEntries });
    decksCount = decks.length;
    deckGroupsCount = deckGroups.length;
    deckSetsCount = deckSets.length;
    deckEntriesCount = deckEntries.length;
  }

  restoreLocalStorage(exportData.localStorage);

  return {
    cardsCount,
    assetsCount,
    collectionsCount,
    decksCount,
    deckGroupsCount,
    deckSetsCount,
    deckEntriesCount,
  };
}

async function applyCompactBackupObject(
  exportData: HqccExportCompactFileV1,
  entries: ZipEntry[],
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

  const entryByName = new Map(entries.map((entry) => [entry.filename, entry]));
  const { apiClient } = await clearExistingLibrary();

  let cardsCount = 0;
  let assetsCount = 0;
  let collectionsCount = 0;
  let decksCount = 0;
  let deckGroupsCount = 0;
  let deckSetsCount = 0;
  let deckEntriesCount = 0;
  const total =
    exportData.assets.length +
    exportData.cards.length +
    (Array.isArray(exportData.collections) ? exportData.collections.length : 0);

  if (exportData.assets.length > 0) {
    for (const assetExport of exportData.assets) {
      try {
        const { blobRef, id, ...rest } = assetExport;
        if (!blobRef || !isValidObfuscatedBlobRef("asset", id, blobRef)) {
          continue;
        }
        const entry = entryByName.get(blobRef);
        if (!entry || entry.directory || !entry.getData) {
          continue;
        }
        const blob = await entry.getData(new BlobWriter(rest.mimeType ?? "application/octet-stream"));
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
      if (cardExport.thumbnailRef) {
        try {
          if (isValidObfuscatedBlobRef("thumb", cardExport.id, cardExport.thumbnailRef)) {
            const entry = entryByName.get(cardExport.thumbnailRef);
            if (entry && !entry.directory && entry.getData) {
              thumbnailBlob = await entry.getData(
                new BlobWriter(cardExport.thumbnailMimeType ?? "image/png"),
              );
            }
          }
        } catch {
          thumbnailBlob = null;
        }
      }

      const {
        thumbnailRef: _thumbnailRef,
        thumbnailMimeType: _thumbnailMimeType,
        pairedWith,
        ...rest
      } = cardExport as CardRecordExportCompactV1;
      void _thumbnailRef;
      void _thumbnailMimeType;
      void pairedWith;
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

  await restorePairs(exportData.cards, exportData.pairs, apiClient);

  const decks = Array.isArray(exportData.decks) ? exportData.decks : [];
  const deckGroups = Array.isArray(exportData.deckGroups) ? exportData.deckGroups : [];
  const deckSets = Array.isArray(exportData.deckSets) ? exportData.deckSets : [];
  const deckEntries = Array.isArray(exportData.deckEntries) ? exportData.deckEntries : [];
  if (decks.length || deckGroups.length || deckSets.length || deckEntries.length) {
    const validation = validateDeckReferences({
      cards: exportData.cards as CardRecord[],
      pairs: Array.isArray(exportData.pairs) ? exportData.pairs : [],
      decks,
      deckGroups,
      deckSets,
      deckEntries,
    });
    if (!validation.valid) {
      throw new Error("Invalid backup file: unresolved deck references");
    }
    await restoreDeckHierarchyAtomic({ decks, deckGroups, deckSets, deckEntries });
    decksCount = decks.length;
    deckGroupsCount = deckGroups.length;
    deckSetsCount = deckSets.length;
    deckEntriesCount = deckEntries.length;
  }

  restoreLocalStorage(exportData.localStorage);

  return {
    cardsCount,
    assetsCount,
    collectionsCount,
    decksCount,
    deckGroupsCount,
    deckSetsCount,
    deckEntriesCount,
  };
}

async function readZipEntries(file: File, useWebWorkers: boolean): Promise<ZipEntry[]> {
  configureZipJs(useWebWorkers);
  let reader: ZipReader<BlobReader> | null = null;
  try {
    reader = new ZipReader(new BlobReader(file));
  } catch {
    throw new Error("This file is not a valid HeroQuest Card Maker backup");
  }

  try {
    return await reader.getEntries();
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
}

async function readTextEntry(entries: ZipEntry[], filename: string) {
  const entry = entries.find((zipEntry) => zipEntry.filename === filename);
  if (!entry || entry.directory || !entry.getData) {
    throw new Error("This file is not a valid HeroQuest Card Maker backup");
  }
  return await entry.getData(new TextWriter());
}

async function readBinaryEntry(entries: ZipEntry[], filename: string) {
  const entry = entries.find((zipEntry) => zipEntry.filename === filename);
  if (!entry || entry.directory || !entry.getData) {
    throw new Error("This file is not a valid HeroQuest Card Maker backup");
  }
  return (await entry.getData(new Uint8ArrayWriter())) as Uint8Array;
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

export async function importBackupHqcc(
  file: File,
  options?: {
    onProgress?: BackupProgressCallback;
    onStatus?: BackupStatusCallback;
    onSecondaryProgress?: BackupSecondaryProgressCallback;
  },
): Promise<ImportResult> {
  options?.onStatus?.("preparing");

  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (
    header.length < 4 ||
    header[0] !== 0x50 ||
    header[1] !== 0x4b ||
    !(
      (header[2] === 0x03 && header[3] === 0x04) ||
      (header[2] === 0x05 && header[3] === 0x06) ||
      (header[2] === 0x07 && header[3] === 0x08)
    )
  ) {
    throw new Error("Unsupported backup format");
  }

  let entries: ZipEntry[];
  try {
    entries = await readZipEntries(file, true);
  } catch {
    entries = await readZipEntries(file, false);
  }

  const manifestEntry = entries.find((zipEntry) => zipEntry.filename === BACKUP_MANIFEST_FILENAME);
  let payloadId: string | null = null;
  if (manifestEntry && !manifestEntry.directory && manifestEntry.getData) {
    try {
      const manifestText = await manifestEntry.getData(new TextWriter());
      const manifest = JSON.parse(manifestText) as { payload?: string };
      payloadId = typeof manifest.payload === "string" ? manifest.payload : null;
    } catch {
      payloadId = null;
    }
  }

  if (payloadId === COMPACT_PAYLOAD_ID_V2) {
    const metadataBytes = await readBinaryEntry(entries, BACKUP_METADATA_FILENAME_V2);
    const exportData = validateCompactBackupObject(stripNulls(decodeMsgpack(metadataBytes)));
    options?.onStatus?.("processing");
    return applyCompactBackupObject(exportData, entries, options?.onProgress);
  }

  if (payloadId === COMPACT_PAYLOAD_ID_V1) {
    const metadataText = await readTextEntry(entries, BACKUP_METADATA_FILENAME_V1);
    const exportData = parseBackupMetadata(metadataText);
    options?.onStatus?.("processing");
    return applyCompactBackupObject(exportData, entries, options?.onProgress);
  }

  if (payloadId && payloadId !== COMPACT_PAYLOAD_ID_V2 && payloadId !== COMPACT_PAYLOAD_ID_V1) {
    throw new Error("Unsupported backup format");
  }

  const legacyText = await readTextEntry(entries, BACKUP_LEGACY_FILENAME);
  const exportData = parseBackupJson(legacyText);

  options?.onStatus?.("processing");
  return applyBackupObject(exportData, options?.onProgress);
}
