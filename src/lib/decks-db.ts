"use client";

import type { DeckEntryRecord } from "@/types/decks-db";
import type { CardFace } from "@/types/card-face";

import { cardTemplatesById } from "@/data/card-templates";
import { resolveEffectiveFace } from "@/lib/card-face";

export const DECKS_STORE = "decks";
export const GROUPS_STORE = "deckGroups";
export const SETS_STORE = "deckSets";
export const ENTRIES_STORE = "deckEntries";
export const PAIRS_STORE = "pairs";
export const ENTRY_COUNT_MIN = 1;
export const ENTRY_COUNT_MAX = 12;

export function sortByIndex<T extends { sortIndex: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sortIndex - b.sortIndex);
}

export function clampEntryCount(value: number): number {
  return Math.max(ENTRY_COUNT_MIN, Math.min(ENTRY_COUNT_MAX, Math.trunc(value)));
}

export function normalizeDeckEntryRecord(
  entry: DeckEntryRecord & { count?: number | null },
): DeckEntryRecord {
  const raw = entry.count;
  const count =
    typeof raw === "number" && Number.isFinite(raw) ? clampEntryCount(raw) : ENTRY_COUNT_MIN;
  return { ...entry, count };
}

export function nextSortIndex(items: { sortIndex: number }[]): number {
  if (!items.length) return 0;
  return Math.max(...items.map((item) => item.sortIndex)) + 1;
}

export function resolveCardFace(templateId: string, cardFace: CardFace | undefined): CardFace {
  const template = cardTemplatesById[templateId as keyof typeof cardTemplatesById];
  if (!template) return cardFace ?? "front";
  return resolveEffectiveFace(cardFace, template.defaultFace);
}
