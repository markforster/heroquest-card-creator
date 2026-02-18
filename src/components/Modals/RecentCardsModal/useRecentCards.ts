"use client";

import { useMemo } from "react";

import type { CardRecord } from "@/types/cards-db";

type UseRecentCardsArgs = {
  cards: CardRecord[];
  limit: number;
};

export function useRecentCards({ cards, limit }: UseRecentCardsArgs) {
  return useMemo(() => {
    const sorted = [...cards].sort((a, b) => {
      const aViewed = a.lastViewedAt ?? 0;
      const bViewed = b.lastViewedAt ?? 0;
      if (bViewed !== aViewed) return bViewed - aViewed;
      if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
      const aName = a.nameLower ?? a.name.toLocaleLowerCase();
      const bName = b.nameLower ?? b.name.toLocaleLowerCase();
      return aName.localeCompare(bName);
    });
    return sorted.slice(0, limit);
  }, [cards, limit]);
}
