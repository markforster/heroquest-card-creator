"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DeckRecord } from "@/api/decks";
import { useListDecks } from "@/api/hooks";
import { resolveDeckPreviewMap } from "@/components/Decks/deck-preview";
import { useDeckMutations } from "@/components/Decks/hooks/useDeckMutations";
import { getSelectedDeckId } from "@/components/Decks/selectors/deckDetailSelectors";

type UseDecksGridModelArgs = {
  previewFanCount: number;
  untitledDeckLabel: string;
};

export function useDecksGridModel({ previewFanCount, untitledDeckLabel }: UseDecksGridModelArgs) {
  const mutations = useDeckMutations();
  const decksQuery = useListDecks(
    { queries: {} },
    { enabled: true, staleTime: 0, refetchOnMount: "always" },
  );

  const [deckPreviews, setDeckPreviews] = useState<Record<string, string[]>>({});
  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set());
  const [isDeleteDeckOpen, setIsDeleteDeckOpen] = useState(false);
  const [deckTitleDraft, setDeckTitleDraft] = useState("");
  const [deckDescriptionDraft, setDeckDescriptionDraft] = useState("");
  const [selectedDeckTitleDraft, setSelectedDeckTitleDraft] = useState("");
  const [isDeckTitleEditing, setIsDeckTitleEditing] = useState(false);
  const [isDeckTitleSaving, setIsDeckTitleSaving] = useState(false);
  const [deckTitleSaveError, setDeckTitleSaveError] = useState<string | null>(null);
  const pendingSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSaveDeckIdRef = useRef<string | null>(null);
  const latestSaveTitleRef = useRef("");
  const previousSelectedDeckIdRef = useRef<string | null>(null);

  const decks = decksQuery.data ?? [];
  const selectedDeckId = useMemo(() => getSelectedDeckId(selectedDeckIds), [selectedDeckIds]);
  const selectedDeck = useMemo(
    () => (selectedDeckId ? decks.find((deck) => deck.id === selectedDeckId) ?? null : null),
    [decks, selectedDeckId],
  );
  const hasSelection = selectedDeckIds.size > 0;
  const isSingleSelection = selectedDeckIds.size === 1;
  const canRenameDeck = isSingleSelection;
  const canDeleteDecks = hasSelection;
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

  const refreshDeckPreviews = useCallback(
    async (deckList: DeckRecord[]) => {
      const pairMap = await mutations.listPairsMap();
      const nextPreviews = await resolveDeckPreviewMap({
        decks: deckList,
        maxCount: previewFanCount,
        pairMap,
      });
      setDeckPreviews(nextPreviews);
    },
    [mutations, previewFanCount],
  );

  const refresh = useCallback(async () => {
    const response = await decksQuery.refetch();
    const nextDecks = response.data ?? [];
    await refreshDeckPreviews(nextDecks);
    return nextDecks;
  }, [decksQuery, refreshDeckPreviews]);

  useEffect(() => {
    let active = true;
    refreshDeckPreviews(decks).catch(() => {
      if (!active) return;
      setDeckPreviews({});
    });
    return () => {
      active = false;
    };
  }, [decks, refreshDeckPreviews]);

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

  const createDeck = useCallback(async () => {
    const createdId = await mutations.createDeck(deckTitleDraft, deckDescriptionDraft, untitledDeckLabel);
    await refresh();
    if (createdId) setSelectedDeckIds(new Set([createdId]));
    setDeckTitleDraft("");
    setDeckDescriptionDraft("");
    return createdId;
  }, [deckDescriptionDraft, deckTitleDraft, mutations, refresh, untitledDeckLabel]);

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
    return () => {
      if (pendingSaveTimeoutRef.current) {
        clearTimeout(pendingSaveTimeoutRef.current);
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
    deckPreviews,
    selectedDeckIds,
    selectedDeckId,
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
    createDeck,
    deleteSelectedDecks,
    duplicateDeck,
    refresh,
    isLoading: decksQuery.isLoading,
  };
}
