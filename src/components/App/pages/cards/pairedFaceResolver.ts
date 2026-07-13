"use client";

import type { PairRecord } from "@/api/pairs/types";
import type { CardFace } from "@/types/card-face";
import type { CardRecord } from "@/types/cards-db";

type ResolvePairedOppositeFaceArgs = {
  activeFaceId?: string | null;
  effectiveFace: CardFace | null;
  preferredOppositeFaceId?: string | null;
  pairs: PairRecord[];
  cards: CardRecord[];
};

type ResolvePairedOppositeFaceResult = {
  resolvedCardId: string | null;
  sortedCandidateIds: string[];
};

export function comparePairedCandidateCards(a: CardRecord, b: CardRecord) {
  const aViewed = a.lastViewedAt ?? 0;
  const bViewed = b.lastViewedAt ?? 0;
  if (bViewed !== aViewed) return bViewed - aViewed;
  if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
  const aName = a.nameLower ?? a.name.toLocaleLowerCase();
  const bName = b.nameLower ?? b.name.toLocaleLowerCase();
  return aName.localeCompare(bName);
}

export function sortPairedCandidateCards(cards: CardRecord[]) {
  return [...cards].sort(comparePairedCandidateCards);
}

export function resolvePairedOppositeFace({
  activeFaceId,
  effectiveFace,
  preferredOppositeFaceId,
  pairs,
  cards,
}: ResolvePairedOppositeFaceArgs): ResolvePairedOppositeFaceResult {
  if (!activeFaceId || (effectiveFace !== "front" && effectiveFace !== "back")) {
    return { resolvedCardId: null, sortedCandidateIds: [] };
  }

  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const candidateIds = Array.from(
    new Set(
      pairs
        .map((pair) => getOppositeFaceId(pair, activeFaceId, effectiveFace))
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const candidateCards = sortPairedCandidateCards(
    candidateIds
      .map((candidateId) => cardsById.get(candidateId))
      .filter((card): card is CardRecord => Boolean(card)),
  );
  const sortedCandidateIds = candidateCards.map((card) => card.id);

  if (preferredOppositeFaceId && sortedCandidateIds.includes(preferredOppositeFaceId)) {
    return {
      resolvedCardId: preferredOppositeFaceId,
      sortedCandidateIds,
    };
  }

  return {
    resolvedCardId: sortedCandidateIds[0] ?? null,
    sortedCandidateIds,
  };
}

function getOppositeFaceId(
  pair: PairRecord,
  activeFaceId: string,
  effectiveFace: CardFace,
) {
  if (effectiveFace === "front") {
    return pair.frontFaceId === activeFaceId ? pair.backFaceId : null;
  }
  return pair.backFaceId === activeFaceId ? pair.frontFaceId : null;
}
