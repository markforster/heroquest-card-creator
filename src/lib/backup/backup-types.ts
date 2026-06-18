"use client";

import type { AssetRecord } from "@/api/assets";
import type { CardRecord } from "@/types/cards-db";
import type {
  DeckEntryRecord,
  DeckGroupRecord,
  DeckRecord,
  DeckSetRecord,
} from "@/types/decks-db";
import type { PairRecord } from "@/types/pairs-db";

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

export type CardRecordExportCompactV1 = Omit<CardRecord, "thumbnailBlob"> & {
  thumbnailRef?: string | null;
  thumbnailMimeType?: string | null;
  pairedWith?: string | null;
};

export type AssetRecordExportCompactV1 = AssetRecord & {
  blobRef: string;
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
  decks?: DeckRecord[];
  deckGroups?: DeckGroupRecord[];
  deckSets?: DeckSetRecord[];
  deckEntries?: DeckEntryRecord[];
  settings?: HqccExportSettingsV1;
  localStorage: HqccExportLocalStorageV1;
}

export interface HqccExportCompactFileV1 {
  schemaVersion: HqccExportSchemaVersion;
  createdAt: string;
  appVersion?: string;
  notes?: string;
  cards: CardRecordExportCompactV1[];
  assets: AssetRecordExportCompactV1[];
  pairs?: PairRecord[];
  collections?: CollectionRecordExportV1[];
  decks?: DeckRecord[];
  deckGroups?: DeckGroupRecord[];
  deckSets?: DeckSetRecord[];
  deckEntries?: DeckEntryRecord[];
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
    decksCount: number;
    deckGroupsCount: number;
    deckSetsCount: number;
    deckEntriesCount: number;
  };
};

export type ImportResult = {
  cardsCount: number;
  assetsCount: number;
  collectionsCount: number;
  decksCount: number;
  deckGroupsCount: number;
  deckSetsCount: number;
  deckEntriesCount: number;
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
