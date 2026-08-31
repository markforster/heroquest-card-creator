"use client";

import type { AssetRecord } from "@/api/assets";
import type { CopyrightTemplateDefaults } from "@/lib/copyright-defaults";
import type { HeroBackLogoRecord } from "@/lib/data/hero-back-logos-db";
import type { ExportSettings } from "@/lib/export-settings";
import type { CardRecord } from "@/types/cards-db";
import type { DeckEntryRecord, DeckGroupRecord, DeckRecord, DeckSetRecord } from "@/types/decks-db";
import type { PairRecord } from "@/types/pairs-db";

/**
 * Current schema version written into exported backup payloads.
 */
export const BACKUP_SCHEMA_VERSION = 2 as const;
/**
 * Filename extension used by plain JSON backup exports.
 */
export const BACKUP_FILE_EXTENSION = ".hqcc.json" as const;
/**
 * Filename extension used by bundled `.hqcc` archive exports.
 */
export const BACKUP_CONTAINER_EXTENSION = ".hqcc" as const;

/**
 * Supported historical schema versions that can be imported.
 */
export type HqccExportSchemaVersion = 1 | 2;

/**
 * Legacy JSON backup representation for a card record.
 */
export type CardRecordExportV1 = Omit<CardRecord, "thumbnailBlob"> & {
  thumbnailDataUrl?: string | null;
  pairedWith?: string | null;
};

/**
 * Legacy JSON backup representation for an asset, with the blob encoded inline.
 */
export type AssetRecordExportV1 = AssetRecord & {
  dataUrl: string;
};

/**
 * Legacy JSON backup representation for a hero-back logo, with the blob encoded inline.
 */
export type HeroBackLogoRecordExportV1 = HeroBackLogoRecord & {
  dataUrl: string;
};

/**
 * Compact archive representation for a card record, with thumbnail content stored separately.
 */
export type CardRecordExportCompactV1 = Omit<CardRecord, "thumbnailBlob"> & {
  thumbnailRef?: string | null;
  thumbnailMimeType?: string | null;
  pairedWith?: string | null;
};

/**
 * Compact archive representation for an asset that points to a bundled blob entry.
 */
export type AssetRecordExportCompactV1 = AssetRecord & {
  blobRef: string;
};

/**
 * Compact archive representation for a hero-back logo that points to a bundled blob entry.
 */
export type HeroBackLogoRecordExportCompactV1 = HeroBackLogoRecord & {
  blobRef: string;
};

/**
 * Export-safe collection payload used by backup files.
 */
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

/**
 * Serialized local-storage values captured by backup export and import flows.
 */
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
  exportCutMarksStyle?: string | null;
  exportRoundedCorners?: string | null;
}

/**
 * Persisted app settings included in a backup payload.
 */
export interface HqccExportSettingsV1 {
  borderSwatches?: string[];
  defaultCopyright?: string;
  copyrightTemplateDefaults?: CopyrightTemplateDefaults;
}

/**
 * Exported render/export profile definition.
 */
export interface HqccExportProfileV1 {
  id: string;
  name: string;
  updatedAt: number;
  settings: ExportSettings;
}

/**
 * Collection of exported render/export profiles.
 */
export interface HqccExportProfilesV1 {
  schemaVersion: 1;
  defaultProfileId: string;
  selectedProfileId?: string;
  profiles: HqccExportProfileV1[];
}

/**
 * Legacy JSON backup payload that inlines binary data as data URLs.
 */
export interface HqccExportFileV1 {
  schemaVersion: HqccExportSchemaVersion;
  createdAt: string;
  appVersion?: string;
  notes?: string;
  cards: CardRecordExportV1[];
  assets: AssetRecordExportV1[];
  heroBackLogos?: HeroBackLogoRecordExportV1[];
  pairs?: PairRecord[];
  collections?: CollectionRecordExportV1[];
  decks?: DeckRecord[];
  deckGroups?: DeckGroupRecord[];
  deckSets?: DeckSetRecord[];
  deckEntries?: DeckEntryRecord[];
  settings?: HqccExportSettingsV1;
  exportProfiles?: HqccExportProfilesV1;
  localStorage: HqccExportLocalStorageV1;
}

/**
 * Compact backup payload that stores binary data in separate archive entries.
 */
export interface HqccExportCompactFileV1 {
  schemaVersion: HqccExportSchemaVersion;
  createdAt: string;
  appVersion?: string;
  notes?: string;
  cards: CardRecordExportCompactV1[];
  assets: AssetRecordExportCompactV1[];
  heroBackLogos?: HeroBackLogoRecordExportCompactV1[];
  pairs?: PairRecord[];
  collections?: CollectionRecordExportV1[];
  decks?: DeckRecord[];
  deckGroups?: DeckGroupRecord[];
  deckSets?: DeckSetRecord[];
  deckEntries?: DeckEntryRecord[];
  settings?: HqccExportSettingsV1;
  exportProfiles?: HqccExportProfilesV1;
  localStorage: HqccExportLocalStorageV1;
}

/**
 * Result returned by export operations together with item counts for progress reporting.
 */
export type ExportResult = {
  blob: Blob;
  fileName: string;
  meta: {
    cardsCount: number;
    assetsCount: number;
    heroBackLogosCount: number;
    collectionsCount: number;
    decksCount: number;
    deckGroupsCount: number;
    deckSetsCount: number;
    deckEntriesCount: number;
  };
};

/**
 * Summary counts returned by import operations.
 */
export type ImportResult = {
  cardsCount: number;
  assetsCount: number;
  heroBackLogosCount: number;
  collectionsCount: number;
  decksCount: number;
  deckGroupsCount: number;
  deckSetsCount: number;
  deckEntriesCount: number;
};

/**
 * High-level backup operation currently being reported.
 */
export type BackupProgressPhase = "export" | "import";
/**
 * Primary progress callback used by backup creation and import flows.
 */
export type BackupProgressCallback = (
  current: number,
  total: number,
  phase: BackupProgressPhase,
) => void;
/**
 * Named sub-phase used by the UI for status messaging.
 */
export type BackupStatusPhase = "preparing" | "processing" | "finalizing";
/**
 * Status callback used by backup flows to announce major phase changes.
 */
export type BackupStatusCallback = (phase: BackupStatusPhase) => void;
/**
 * Secondary percentage callback used for nested progress within a major status phase.
 */
export type BackupSecondaryProgressCallback = (percent: number, phase: BackupStatusPhase) => void;
