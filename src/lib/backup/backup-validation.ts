"use client";

import type { CardRecord } from "@/types/cards-db";
import type {
  DeckEntryRecord,
  DeckGroupRecord,
  DeckRecord,
  DeckSetRecord,
} from "@/types/decks-db";
import type { PairRecord } from "@/types/pairs-db";
import type { DeckUsageLocation } from "@/lib/decks-errors";

import { openHqccDexieDb } from "../hqcc-dexie";
import type { HqccExportCompactFileV1, HqccExportFileV1 } from "./backup-types";

export function parseBackupJson(text: string): HqccExportFileV1 {
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

export function validateCompactBackupObject(parsed: unknown): HqccExportCompactFileV1 {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("This file is not a valid HeroQuest Card Maker backup");
  }

  const candidate = parsed as Partial<HqccExportCompactFileV1>;

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

  return candidate as HqccExportCompactFileV1;
}

export function stripNulls<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripNulls(entry)) as T;
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry === null) continue;
      next[key] = stripNulls(entry);
    }
    return next as T;
  }
  return value;
}

export function parseBackupMetadata(text: string): HqccExportCompactFileV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This file is not a valid HeroQuest Card Maker backup");
  }

  return validateCompactBackupObject(stripNulls(parsed));
}

export function dedupeDeckUsageRows(rows: DeckUsageLocation[]): DeckUsageLocation[] {
  const map = new Map<string, DeckUsageLocation>();
  rows.forEach((row) => {
    const key = `${row.deckId}:${row.groupId}:${row.setId}`;
    if (!map.has(key)) map.set(key, row);
  });
  return Array.from(map.values());
}

export function validateDeckReferences(input: {
  cards: Array<Pick<CardRecord, "id">>;
  pairs: Array<Pick<PairRecord, "id">>;
  decks: DeckRecord[];
  deckGroups: DeckGroupRecord[];
  deckSets: DeckSetRecord[];
  deckEntries: DeckEntryRecord[];
}): {
  valid: boolean;
  usage: DeckUsageLocation[];
  issues: string[];
} {
  const cardIds = new Set(input.cards.map((card) => card.id));
  const pairIds = new Set(input.pairs.map((pair) => pair.id));
  const deckMap = new Map(input.decks.map((deck) => [deck.id, deck]));
  const groupMap = new Map(input.deckGroups.map((group) => [group.id, group]));
  const setMap = new Map(input.deckSets.map((set) => [set.id, set]));
  const usage: DeckUsageLocation[] = [];
  const issues: string[] = [];

  input.deckGroups.forEach((group) => {
    if (!deckMap.has(group.deckId)) {
      issues.push(`Group ${group.id} references missing deck ${group.deckId}`);
    }
  });

  input.deckSets.forEach((set) => {
    const group = groupMap.get(set.groupId);
    const deck = deckMap.get(set.deckId);
    if (!deck) {
      issues.push(`Set ${set.id} references missing deck ${set.deckId}`);
      return;
    }
    if (!group) {
      issues.push(`Set ${set.id} references missing group ${set.groupId}`);
      return;
    }
    if (!cardIds.has(set.backFaceId)) {
      usage.push({
        deckId: deck.id,
        deckTitle: deck.title,
        groupId: group.id,
        groupTitle: group.title ?? "",
        setId: set.id,
        setTitle: set.title ?? "",
      });
      issues.push(`Set ${set.id} references missing back card ${set.backFaceId}`);
    }
  });

  input.deckEntries.forEach((entry) => {
    const set = setMap.get(entry.setId);
    const deck = deckMap.get(entry.deckId);
    const group = set ? groupMap.get(set.groupId) : null;
    if (!deck) {
      issues.push(`Entry ${entry.id} references missing deck ${entry.deckId}`);
      return;
    }
    if (!set) {
      issues.push(`Entry ${entry.id} references missing set ${entry.setId}`);
      return;
    }
    if (!pairIds.has(entry.pairId)) {
      if (group) {
        usage.push({
          deckId: deck.id,
          deckTitle: deck.title,
          groupId: group.id,
          groupTitle: group.title ?? "",
          setId: set.id,
          setTitle: set.title ?? "",
        });
      }
      issues.push(`Entry ${entry.id} references missing pair ${entry.pairId}`);
    }
  });

  const dedupedUsage = dedupeDeckUsageRows(usage);
  return { valid: issues.length === 0, usage: dedupedUsage, issues };
}

export async function restoreDeckHierarchyAtomic(input: {
  decks: DeckRecord[];
  deckGroups: DeckGroupRecord[];
  deckSets: DeckSetRecord[];
  deckEntries: DeckEntryRecord[];
}): Promise<void> {
  const db = await openHqccDexieDb();

  try {
    await db.transaction("rw", db.decks, db.deckGroups, db.deckSets, db.deckEntries, async () => {
      await db.decks.bulkAdd(input.decks);
      await db.deckGroups.bulkAdd(input.deckGroups);
      await db.deckSets.bulkAdd(input.deckSets);
      await db.deckEntries.bulkAdd(input.deckEntries);
    });
  } catch (error) {
    const wrapped = new Error("Failed to restore deck hierarchy");
    (wrapped as Error & { cause?: unknown }).cause = error;
    throw wrapped;
  }
}
