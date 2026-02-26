import { useMemo } from "react";

import { cardTemplatesById } from "@/data/card-templates";
import type { CardRecord } from "@/types/cards-db";
import type { CollectionRecord } from "@/types/collections-db";

type ActiveFilter =
  | { type: "all" }
  | { type: "recent" }
  | { type: "unfiled" }
  | { type: "recentlyDeleted" }
  | { type: "collection"; id: string };

type UseStockpileFiltersOptions = {
  cards: CardRecord[];
  collections: CollectionRecord[];
  search: string;
  templateFilter: string;
  activeFilter: ActiveFilter;
  isPairMode: boolean;
  isPairBacks: boolean;
  showUnpairedOnly?: boolean;
  pairedIdSet?: Set<string>;
  showMissingArtworkOnly?: boolean;
  missingArtworkIdSet?: Set<string>;
};

export const useStockpileFilters = ({
  cards,
  collections,
  search,
  templateFilter,
  activeFilter,
  isPairMode,
  isPairBacks,
  showUnpairedOnly = false,
  pairedIdSet,
  showMissingArtworkOnly = false,
  missingArtworkIdSet,
}: UseStockpileFiltersOptions) => {
  const recentCards = useMemo(() => {
    const withViewed = cards
      .filter((card) => card.deletedAt == null)
      .filter((card) => typeof card.lastViewedAt === "number");
    const filtered = isPairMode
      ? withViewed.filter((card) => {
          const template = cardTemplatesById[card.templateId];
          if (!template) return false;
          const effectiveFace = card.face ?? template.defaultFace;
          return isPairBacks ? effectiveFace === "back" : effectiveFace === "front";
        })
      : withViewed;
    return filtered.sort((a, b) => {
      const aViewed = a.lastViewedAt ?? 0;
      const bViewed = b.lastViewedAt ?? 0;
      if (bViewed !== aViewed) {
        return bViewed - aViewed;
      }
      return b.updatedAt - a.updatedAt;
    });
  }, [cards, isPairMode, isPairBacks]);

  const {
    filteredCards,
    collectionCounts,
    unfiledCount,
    typeCounts,
    totalCount,
    faceCounts,
    visibleCollectionIds,
    eligibleIdSet,
    overallCount,
    recentlyDeletedCount,
    recentlyDeletedTotalCount,
  } = useMemo(() => {
    const isFrontCard = (card: CardRecord) => {
      const template = cardTemplatesById[card.templateId];
      if (!template) return false;
      const effectiveFace = card.face ?? template.defaultFace;
      return effectiveFace === "front";
    };
    const isBackCard = (card: CardRecord) => {
      const template = cardTemplatesById[card.templateId];
      if (!template) return false;
      const effectiveFace = card.face ?? template.defaultFace;
      return effectiveFace === "back";
    };

    const activeCards = cards.filter((card) => card.deletedAt == null);
    const deletedCards = cards.filter((card) => typeof card.deletedAt === "number");

    const applyGlobalFilters = (base: CardRecord[]) => {
      let next = base;

      if (search.trim()) {
        const q = search.toLocaleLowerCase();
        next = next.filter((card) => card.nameLower.includes(q));
      }

      if (showMissingArtworkOnly && missingArtworkIdSet) {
        next = next.filter((card) => missingArtworkIdSet.has(card.id));
      }

      if (showUnpairedOnly && pairedIdSet) {
        next = next.filter((card) => !pairedIdSet.has(card.id));
      }

      return next;
    };

    const applyTemplateFilter = (base: CardRecord[]) => {
      if (templateFilter === "all") return base;
      if (templateFilter === "front") return base.filter(isFrontCard);
      if (templateFilter === "back") return base.filter(isBackCard);
      return base.filter((card) => card.templateId === templateFilter);
    };

    const recentlyDeletedTotalCount = deletedCards.length;
    const recentlyDeletedCount = applyTemplateFilter(applyGlobalFilters(deletedCards)).length;

    // Counts should not change when switching activeFilter (e.g. Recently deleted).
    // They should only reflect global toolbar filters (search/toggles) over the active library.
    const countsBase = applyGlobalFilters(
      isPairMode
        ? isPairBacks
          ? activeCards.filter(isBackCard)
          : activeCards.filter(isFrontCard)
        : activeCards,
    );
    const cardIdSet = new Set(countsBase.map((card) => card.id));
    const counts = new Map<string, number>();
    const membershipIndex = new Map<string, number>();
    // Eligibility should ignore soft-deleted cards.
    const eligibleBase = isPairMode
      ? isPairBacks
        ? activeCards.filter(isBackCard)
        : activeCards.filter(isFrontCard)
      : activeCards;
    const eligibleIdSet = new Set(eligibleBase.map((card) => card.id));
    const visibleCollectionIds = new Set<string>();

    collections.forEach((collection) => {
      let count = 0;
      collection.cardIds.forEach((cardId) => {
        if (cardIdSet.has(cardId)) {
          count += 1;
          membershipIndex.set(cardId, (membershipIndex.get(cardId) ?? 0) + 1);
        }
      });
      counts.set(collection.id, count);
      if (collection.cardIds.some((cardId) => eligibleIdSet.has(cardId))) {
        visibleCollectionIds.add(collection.id);
      }
    });

    const unfiled = countsBase.reduce((total, card) => {
      return membershipIndex.has(card.id) ? total : total + 1;
    }, 0);

    const deletedSorted = [...deletedCards].sort((a, b) => {
      const aDeleted = a.deletedAt ?? 0;
      const bDeleted = b.deletedAt ?? 0;
      if (bDeleted !== aDeleted) return bDeleted - aDeleted;
      return b.updatedAt - a.updatedAt;
    });

    const resultsSeed =
      activeFilter.type === "recentlyDeleted"
        ? deletedSorted
        : activeFilter.type === "recent"
          ? recentCards
          : countsBase;

    let filteredBase = applyGlobalFilters(resultsSeed);
    if (activeFilter.type === "collection") {
      const collection = collections.find((item) => item.id === activeFilter.id);
      if (!collection) {
        return {
          filteredCards: filteredBase,
          collectionCounts: counts,
          unfiledCount: unfiled,
          typeCounts: new Map<string, number>(),
          totalCount: filteredBase.length,
          faceCounts: { front: 0, back: 0 },
          visibleCollectionIds,
          eligibleIdSet,
          overallCount: countsBase.length,
          recentlyDeletedCount,
          recentlyDeletedTotalCount,
        };
      }
      const allowed = new Set(collection.cardIds);
      filteredBase = filteredBase.filter((card) => allowed.has(card.id));
    }

    if (activeFilter.type === "unfiled") {
      filteredBase = filteredBase.filter((card) => !membershipIndex.has(card.id));
    }

    const templateCounts = new Map<string, number>();
    filteredBase.forEach((card) => {
      templateCounts.set(card.templateId, (templateCounts.get(card.templateId) ?? 0) + 1);
    });
    const nextFaceCounts = {
      front: 0,
      back: 0,
    };
    filteredBase.forEach((card) => {
      const template = cardTemplatesById[card.templateId];
      if (!template) return;
      const effectiveFace = card.face ?? template.defaultFace;
      if (effectiveFace === "front") {
        nextFaceCounts.front += 1;
      } else if (effectiveFace === "back") {
        nextFaceCounts.back += 1;
      }
    });

    let filtered = filteredBase;
    if (templateFilter === "front") {
      filtered = filtered.filter((card) => {
        const template = cardTemplatesById[card.templateId];
        if (!template) return false;
        const effectiveFace = card.face ?? template.defaultFace;
        return effectiveFace === "front";
      });
    } else if (templateFilter === "back") {
      filtered = filtered.filter((card) => {
        const template = cardTemplatesById[card.templateId];
        if (!template) return false;
        const effectiveFace = card.face ?? template.defaultFace;
        return effectiveFace === "back";
      });
    } else if (templateFilter !== "all") {
      filtered = filtered.filter((card) => card.templateId === templateFilter);
    }

    if (isPairMode) {
      filtered = [...filtered].sort((a, b) => {
        const aViewed = a.lastViewedAt ?? 0;
        const bViewed = b.lastViewedAt ?? 0;
        if (bViewed !== aViewed) return bViewed - aViewed;
        if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
        const aName = a.nameLower ?? a.name.toLocaleLowerCase();
        const bName = b.nameLower ?? b.name.toLocaleLowerCase();
        return aName.localeCompare(bName);
      });
    }

    return {
      filteredCards: filtered,
      collectionCounts: counts,
      unfiledCount: unfiled,
      typeCounts: templateCounts,
      totalCount: filteredBase.length,
      faceCounts: nextFaceCounts,
      visibleCollectionIds,
      eligibleIdSet,
      overallCount: countsBase.length,
      recentlyDeletedCount,
      recentlyDeletedTotalCount,
    };
  }, [
    cards,
    recentCards,
    search,
    templateFilter,
    activeFilter,
    collections,
    isPairMode,
    isPairBacks,
    showUnpairedOnly,
    pairedIdSet,
    showMissingArtworkOnly,
    missingArtworkIdSet,
  ]);

  return {
    recentCards,
    filteredCards,
    collectionCounts,
    unfiledCount,
    typeCounts,
    totalCount,
    faceCounts,
    visibleCollectionIds,
    eligibleIdSet,
    overallCount,
    recentlyDeletedCount,
    recentlyDeletedTotalCount,
  };
};
