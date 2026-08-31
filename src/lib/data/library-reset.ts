"use client";

import { openHqccDexieDb } from "@/lib/db/hqcc-dexie";
import { clearDbEstimateCache } from "@/lib/db/maintenance/indexeddb-size-tracker";

export type LibraryResetSummary = {
  cards: number;
  cardThumbnails: number;
  cardComponents: number;
  pairs: number;
  assets: number;
  heroBackLogos: number;
  collections: number;
  decks: number;
  deckGroups: number;
  deckSets: number;
  deckEntries: number;
  totalLibraryRecords: number;
  isEmpty: boolean;
};

const LIBRARY_LOCAL_STORAGE_KEYS = [
  "hqcc.activeCards.v1",
  "hqcc.selectedCollectionId",
  "hqcc.draft.v1",
  "hqcc.draftTemplateId.v1",
  "hqcc.draftSourceCardId.v1",
  "hqcc.cardDrafts.v1",
  "hqcc.collectionsTreeExpanded",
] as const;

const LIBRARY_SESSION_STORAGE_KEYS = ["hqcc.initialLoadCompleted"] as const;

async function countLibraryRecords(): Promise<LibraryResetSummary> {
  const db = await openHqccDexieDb();
  const componentTables = [
    db.cardSlotLinks,
    db.cardBackgroundComponents,
    db.cardBorderComponents,
    db.cardTitleComponents,
    db.cardTextComponents,
    db.cardCopyrightComponents,
    db.cardImageComponents,
    db.cardHeroBackLogoComponents,
    db.cardIconComponents,
    db.cardHeroStatsComponents,
    db.cardMonsterStatsComponents,
  ] as const;

  const [cards, cardThumbnails, ...componentCounts] = await Promise.all([
    db.cardsBase.count(),
    db.cardThumbnails.count(),
    ...componentTables.map((table) => table.count()),
  ]);

  const [pairs, assets, heroBackLogos, collections, decks, deckGroups, deckSets, deckEntries] =
    await Promise.all([
      db.pairs.count(),
      db.assets.count(),
      db.heroBackLogos.count(),
      db.collections.count(),
      db.decks.count(),
      db.deckGroups.count(),
      db.deckSets.count(),
      db.deckEntries.count(),
    ]);

  const cardComponents = componentCounts.reduce((total, count) => total + count, 0);
  const totalLibraryRecords =
    cards +
    cardThumbnails +
    cardComponents +
    pairs +
    assets +
    heroBackLogos +
    collections +
    decks +
    deckGroups +
    deckSets +
    deckEntries;

  return {
    cards,
    cardThumbnails,
    cardComponents,
    pairs,
    assets,
    heroBackLogos,
    collections,
    decks,
    deckGroups,
    deckSets,
    deckEntries,
    totalLibraryRecords,
    isEmpty: totalLibraryRecords === 0,
  };
}

function clearLibraryBrowserStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    LIBRARY_LOCAL_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Ignore storage failures; IndexedDB reset should remain the source of truth.
  }

  try {
    LIBRARY_SESSION_STORAGE_KEYS.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Ignore storage failures; the app can still operate after the library reset.
  }

  clearDbEstimateCache();
}

export async function getLibraryResetSummary(): Promise<LibraryResetSummary> {
  return countLibraryRecords();
}

export async function isLibraryEmpty(): Promise<boolean> {
  const summary = await countLibraryRecords();
  return summary.isEmpty;
}

export async function resetLibraryData(): Promise<LibraryResetSummary> {
  const db = await openHqccDexieDb();
  const summary = await countLibraryRecords();
  const tablesToClear = [
    db.cardsBase,
    db.cardThumbnails,
    db.cardSlotLinks,
    db.cardBackgroundComponents,
    db.cardBorderComponents,
    db.cardTitleComponents,
    db.cardTextComponents,
    db.cardCopyrightComponents,
    db.cardImageComponents,
    db.cardHeroBackLogoComponents,
    db.cardIconComponents,
    db.cardHeroStatsComponents,
    db.cardMonsterStatsComponents,
    db.pairs,
    db.assets,
    db.heroBackLogos,
    db.collections,
    db.decks,
    db.deckGroups,
    db.deckSets,
    db.deckEntries,
  ] as const;

  await db.transaction("rw", tablesToClear, async () => {
    await Promise.all(tablesToClear.map((table) => table.clear()));
  });

  clearLibraryBrowserStorage();

  return summary;
}
