"use client";

import type { CardRecord } from "@/api/cards";
import { apiClient } from "@/api/client";

export async function hydrateCardsForExport(cards: CardRecord[]): Promise<CardRecord[]> {
  if (!cards.length) {
    return [];
  }

  const records = await Promise.all(
    cards.map(async (card) => {
      try {
        return await apiClient.getCard({ params: { id: card.id } });
      } catch {
        return null;
      }
    }),
  );

  return records.filter((record): record is CardRecord => Boolean(record));
}
