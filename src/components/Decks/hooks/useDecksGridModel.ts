"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useListCards, useListDecks, useListPairs } from "@/api/hooks";
import { apiClient } from "@/api/client";
import { useDeckMutations } from "@/components/Decks/hooks/useDeckMutations";
import { getSelectedDeckId } from "@/components/Decks/selectors/deckDetailSelectors";
import { getCardThumbnailUrl } from "@/lib/card-thumbnail-cache";

type UseDecksGridModelArgs = {
  untitledDeckLabel: string;
};

export function useDecksGridModel({ untitledDeckLabel }: UseDecksGridModelArgs) {
  const mutations = useDeckMutations();
  const decksQuery = useListDecks(
    { queries: {} },
    { enabled: true, staleTime: 0, refetchOnMount: "always" },
  );

  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set());
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deckSearchTextsByDeckId, setDeckSearchTextsByDeckId] = useState<Record<string, string[]>>({});
  const [deckBackgroundUrlByDeckId, setDeckBackgroundUrlByDeckId] = useState<Record<string, string | null>>({});
  const [deckDraftTargetId, setDeckDraftTargetId] = useState<string | null>(null);
  const [isDeleteDeckOpen, setIsDeleteDeckOpen] = useState(false);
  const [deckTitleDraft, setDeckTitleDraft] = useState("");
  const [deckDescriptionDraft, setDeckDescriptionDraft] = useState("");
  const [selectedDeckTitleDraft, setSelectedDeckTitleDraft] = useState("");
  const [isDeckTitleEditing, setIsDeckTitleEditing] = useState(false);
  const [isDeckTitleSaving, setIsDeckTitleSaving] = useState(false);
  const [deckTitleSaveError, setDeckTitleSaveError] = useState<string | null>(null);
  const pendingSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deckTitlesRequestIdRef = useRef(0);
  const latestSaveDeckIdRef = useRef<string | null>(null);
  const latestSaveTitleRef = useRef("");
  const previousSelectedDeckIdRef = useRef<string | null>(null);

  const decks = useMemo(() => {
    if (Array.isArray(decksQuery.data)) return decksQuery.data;
    return [];
  }, [decksQuery.data]);
  const cardsQuery = useListCards(
    { queries: {} },
    { enabled: true, staleTime: 0, refetchOnMount: "always" },
  );
  const pairsQuery = useListPairs(
    { queries: {} },
    { enabled: true, staleTime: 0, refetchOnMount: "always" },
  );
  const selectedDeckId = useMemo(() => getSelectedDeckId(selectedDeckIds), [selectedDeckIds]);
  const selectedDeck = useMemo(
    () => (selectedDeckId ? decks.find((deck) => deck.id === selectedDeckId) ?? null : null),
    [decks, selectedDeckId],
  );
  const hasSelection = selectedDeckIds.size > 0;
  const isSingleSelection = selectedDeckIds.size === 1;
  const canRenameDeck = isSingleSelection;
  const canDeleteDecks = hasSelection;
  const isDeleteSelectedEnabled = hasSelection;
  const hasAnyDecks = decks.length > 0;

  const normalizedSearchQuery = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);
  const filteredDecks = useMemo(() => {
    if (normalizedSearchQuery === "") return decks;

    return decks.filter((deck) => {
      const titleMatch = deck.title.toLowerCase().includes(normalizedSearchQuery);
      if (titleMatch) return true;
      const searchTexts = deckSearchTextsByDeckId[deck.id] ?? [];
      return searchTexts.some((text) => text.toLowerCase().includes(normalizedSearchQuery));
    });
  }, [deckSearchTextsByDeckId, decks, normalizedSearchQuery]);
  const visibleDeckCount = filteredDecks.length;
  const selectedCount = selectedDeckIds.size;
  const hasVisibleResults = visibleDeckCount > 0;
  const effectiveDeckTitleById = useMemo(() => {
    const next: Record<string, string> = {};
    decks.forEach((deck) => {
      next[deck.id] = deck.title === "" ? untitledDeckLabel : deck.title;
    });
    if (isSingleSelection && selectedDeckId) {
      next[selectedDeckId] =
        selectedDeckTitleDraft === "" ? untitledDeckLabel : selectedDeckTitleDraft;
    }
    return next;
  }, [decks, isSingleSelection, selectedDeckId, selectedDeckTitleDraft, untitledDeckLabel]);

  const refresh = useCallback(async () => {
    const response = await decksQuery.refetch();
    if (Array.isArray(response.data)) return response.data;
    return [];
  }, [decksQuery]);

  useEffect(() => {
    if (!isSingleSelection || !selectedDeckId) {
      previousSelectedDeckIdRef.current = null;
      setSelectedDeckTitleDraft("");
      setIsDeckTitleEditing(false);
      setIsDeckTitleSaving(false);
      setDeckTitleSaveError(null);
      return;
    }
    if (previousSelectedDeckIdRef.current !== selectedDeckId) {
      previousSelectedDeckIdRef.current = selectedDeckId;
      setSelectedDeckTitleDraft(selectedDeck?.title ?? "");
      setIsDeckTitleEditing(false);
      setIsDeckTitleSaving(false);
      setDeckTitleSaveError(null);
      return;
    }
    if (!isDeckTitleEditing && selectedDeck) {
      setSelectedDeckTitleDraft(selectedDeck.title);
    }
  }, [isDeckTitleEditing, isSingleSelection, selectedDeck, selectedDeckId]);

  const flushPendingDeckTitleSave = useCallback(async () => {
    if (!latestSaveDeckIdRef.current) return false;
    const deckId = latestSaveDeckIdRef.current;
    const title = latestSaveTitleRef.current;
    latestSaveDeckIdRef.current = null;
    try {
      setIsDeckTitleSaving(true);
      setDeckTitleSaveError(null);
      await mutations.updateDeckTitle(deckId, title, untitledDeckLabel);
      await refresh();
      setIsDeckTitleSaving(false);
      return true;
    } catch (error) {
      setIsDeckTitleSaving(false);
      setDeckTitleSaveError(error instanceof Error ? error.message : "Failed to save deck title");
      return false;
    }
  }, [mutations, refresh, untitledDeckLabel]);

  const cancelPendingDeckTitleSave = useCallback(() => {
    if (pendingSaveTimeoutRef.current) {
      clearTimeout(pendingSaveTimeoutRef.current);
      pendingSaveTimeoutRef.current = null;
    }
    latestSaveDeckIdRef.current = null;
  }, []);

  const scheduleDeckTitleSave = useCallback(() => {
    if (pendingSaveTimeoutRef.current) {
      clearTimeout(pendingSaveTimeoutRef.current);
    }
    pendingSaveTimeoutRef.current = setTimeout(async () => {
      pendingSaveTimeoutRef.current = null;
      await flushPendingDeckTitleSave();
    }, 250);
  }, [flushPendingDeckTitleSave]);

  const selectDeck = useCallback((deckId: string, hasModifier: boolean) => {
    setSelectedDeckIds((prev) => {
      if (hasModifier) {
        const next = new Set(prev);
        if (next.has(deckId)) next.delete(deckId);
        else next.add(deckId);
        return next;
      }
      if (prev.size === 1 && prev.has(deckId)) return new Set();
      return new Set([deckId]);
    });
  }, []);


  const clearSelectedDecks = useCallback(() => {
    setSelectedDeckIds(new Set());
  }, []);

  const createDeck = useCallback(async () => {
    const createdId = await mutations.createDeck(deckTitleDraft, deckDescriptionDraft, untitledDeckLabel);
    await refresh();
    if (createdId) setSelectedDeckIds(new Set([createdId]));
    setDeckTitleDraft("");
    setDeckDescriptionDraft("");
    return createdId;
  }, [deckDescriptionDraft, deckTitleDraft, mutations, refresh, untitledDeckLabel]);

  const beginCreateDeckDraft = useCallback(() => {
    setDeckDraftTargetId(null);
    setDeckTitleDraft("");
    setDeckDescriptionDraft("");
  }, []);

  const beginEditDeckDraft = useCallback(
    (deckId: string) => {
      const deck = decks.find((item) => item.id === deckId);
      if (!deck) return false;
      setDeckDraftTargetId(deckId);
      setDeckTitleDraft(deck.title);
      setDeckDescriptionDraft(deck.description ?? "");
      return true;
    },
    [decks],
  );

  const cancelDeckDraft = useCallback(() => {
    setDeckDraftTargetId(null);
    setDeckTitleDraft("");
    setDeckDescriptionDraft("");
  }, []);

  const submitDeckDraft = useCallback(async () => {
    if (!deckDraftTargetId) {
      return createDeck();
    }
    await mutations.updateDeck(
      deckDraftTargetId,
      deckTitleDraft,
      deckDescriptionDraft,
      untitledDeckLabel,
    );
    await refresh();
    return deckDraftTargetId;
  }, [
    createDeck,
    deckDescriptionDraft,
    deckDraftTargetId,
    deckTitleDraft,
    mutations,
    refresh,
    untitledDeckLabel,
  ]);

  const deleteSelectedDecks = useCallback(async () => {
    await mutations.deleteDecks(Array.from(selectedDeckIds));
    setSelectedDeckIds(new Set());
    await refresh();
  }, [mutations, refresh, selectedDeckIds]);

  const duplicateDeck = useCallback(
    async (deckId: string) => {
      const newDeckId = await mutations.duplicateDeck(deckId);
      await refresh();
      return newDeckId;
    },
    [mutations, refresh],
  );

  const startDeckTitleEdit = useCallback(() => {
    if (!isSingleSelection || !selectedDeck) return false;
    setSelectedDeckTitleDraft(selectedDeck.title);
    setIsDeckTitleEditing(true);
    return true;
  }, [isSingleSelection, selectedDeck]);

  const cancelDeckTitleEdit = useCallback(() => {
    cancelPendingDeckTitleSave();
    setSelectedDeckTitleDraft(selectedDeck?.title ?? "");
    setIsDeckTitleEditing(false);
    setDeckTitleSaveError(null);
  }, [cancelPendingDeckTitleSave, selectedDeck?.title]);

  const commitDeckTitleEdit = useCallback(async () => {
    if (!isSingleSelection || !selectedDeckId) return false;
    latestSaveDeckIdRef.current = selectedDeckId;
    latestSaveTitleRef.current = selectedDeckTitleDraft;
    return flushPendingDeckTitleSave();
  }, [
    flushPendingDeckTitleSave,
    isSingleSelection,
    selectedDeckId,
    selectedDeckTitleDraft,
  ]);

  const onDeckTitleDraftChangeLive = useCallback(
    (nextValue: string) => {
      setSelectedDeckTitleDraft(nextValue);
      if (!isSingleSelection || !selectedDeckId) return;
      setIsDeckTitleEditing(true);
      setDeckTitleSaveError(null);
      latestSaveDeckIdRef.current = selectedDeckId;
      latestSaveTitleRef.current = nextValue;
      scheduleDeckTitleSave();
    },
    [isSingleSelection, scheduleDeckTitleSave, selectedDeckId],
  );

  useEffect(() => {
    if (searchDebounceTimeoutRef.current) {
      clearTimeout(searchDebounceTimeoutRef.current);
    }
    searchDebounceTimeoutRef.current = setTimeout(() => {
      setSearchQuery(searchDraft);
    }, 200);
    return () => {
      if (searchDebounceTimeoutRef.current) {
        clearTimeout(searchDebounceTimeoutRef.current);
      }
    };
  }, [searchDraft]);

  useEffect(() => {
    let isCancelled = false;
    const requestId = deckTitlesRequestIdRef.current + 1;
    deckTitlesRequestIdRef.current = requestId;

    const cards = Array.isArray(cardsQuery.data) ? cardsQuery.data : [];
    const pairs = Array.isArray(pairsQuery.data) ? pairsQuery.data : [];

    if (!decks.length || !cards.length) {
      setDeckSearchTextsByDeckId({});
      setDeckBackgroundUrlByDeckId({});
      return () => {
        isCancelled = true;
      };
    }

    const cardTitleById = new Map<string, string>();
    cards.forEach((card) => {
      cardTitleById.set(card.id, card.title ?? card.name ?? "");
    });
    const frontFaceIdByPairId = new Map<string, string>();
    pairs.forEach((pair) => {
      if (pair.frontFaceId) frontFaceIdByPairId.set(pair.id, pair.frontFaceId);
    });

    void (async () => {
      const next: Record<string, string[]> = {};
      const nextBackgroundUrls: Record<string, string | null> = {};
      for (const deck of decks) {
        const sets = await apiClient.listDeckSets({ params: { deckId: deck.id } });
        const frontIds = new Set<string>();
        const searchable = new Set<string>();
        const keySet = deck.keySetId ? sets.find((set) => set.id === deck.keySetId) ?? null : null;
        await Promise.all(
          sets.map(async (set) => {
            const backFaceTitle = cardTitleById.get(set.backFaceId) ?? "";
            if (backFaceTitle !== "") searchable.add(backFaceTitle);
            const entries = await apiClient.listDeckEntries({ params: { setId: set.id } });
            entries.forEach((entry) => {
              const frontFaceId = frontFaceIdByPairId.get(entry.pairId);
              if (frontFaceId) frontIds.add(frontFaceId);
            });
          }),
        );
        Array.from(frontIds).forEach((id) => {
          const title = cardTitleById.get(id) ?? "";
          if (title !== "") searchable.add(title);
        });
        next[deck.id] = Array.from(searchable);

        const primaryBackgroundCardId = keySet?.backFaceId ?? null;
        const fallbackBackgroundCardId = Array.from(frontIds)[0] ?? null;
        const backgroundCardId = primaryBackgroundCardId ?? fallbackBackgroundCardId;
        if (!backgroundCardId) {
          nextBackgroundUrls[deck.id] = null;
        } else {
          nextBackgroundUrls[deck.id] = await getCardThumbnailUrl(backgroundCardId);
        }
      }

      if (isCancelled) return;
      if (deckTitlesRequestIdRef.current !== requestId) return;
      setDeckSearchTextsByDeckId(next);
      setDeckBackgroundUrlByDeckId(nextBackgroundUrls);
    })();

    return () => {
      isCancelled = true;
    };
  }, [cardsQuery.data, decks, pairsQuery.data]);

  useEffect(() => {
    return () => {
      if (pendingSaveTimeoutRef.current) {
        clearTimeout(pendingSaveTimeoutRef.current);
      }
      if (searchDebounceTimeoutRef.current) {
        clearTimeout(searchDebounceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isSingleSelection) {
      cancelPendingDeckTitleSave();
      return;
    }
    if (!selectedDeckId) {
      cancelPendingDeckTitleSave();
      return;
    }
  }, [cancelPendingDeckTitleSave, isSingleSelection, selectedDeckId]);

  return {
    decks,
    filteredDecks,
    deckDraftTargetId,
    deckBackgroundUrlByDeckId,
    selectedDeckIds,
    selectedDeckId,
    selectedCount,
    visibleDeckCount,
    hasVisibleResults,
    hasAnyDecks,
    searchDraft,
    setSearchDraft,
    isDeleteSelectedEnabled,
    isDeleteDeckOpen,
    setIsDeleteDeckOpen,
    deckTitleDraft,
    setDeckTitleDraft,
    deckDescriptionDraft,
    setDeckDescriptionDraft,
    selectedDeck,
    selectedDeckTitleDraft,
    setSelectedDeckTitleDraft,
    effectiveDeckTitleById,
    isDeckTitleEditing,
    isDeckTitleSaving,
    deckTitleSaveError,
    canRenameDeck,
    canDeleteDecks,
    startDeckTitleEdit,
    cancelDeckTitleEdit,
    commitDeckTitleEdit,
    onDeckTitleDraftChangeLive,
    selectDeck,
    clearSelectedDecks,
    createDeck,
    beginCreateDeckDraft,
    beginEditDeckDraft,
    cancelDeckDraft,
    submitDeckDraft,
    deleteSelectedDecks,
    duplicateDeck,
    refresh,
    isLoading: decksQuery.isLoading,
  };
}
