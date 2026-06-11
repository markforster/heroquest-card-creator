import { act, renderHook, waitFor } from "@testing-library/react";

import { useDecksGridModel } from "@/components/Decks/hooks/useDecksGridModel";

const mockUseListDecks = jest.fn();
const mockUseListCards = jest.fn();
const mockUseListPairs = jest.fn();
const mockUseDeckMutations = jest.fn();
const mockListDeckSets = jest.fn();
const mockListDeckEntries = jest.fn();
const mockGetCardThumbnailUrl = jest.fn();

jest.mock("@/api/hooks", () => ({
  useListDecks: (...args: unknown[]) => mockUseListDecks(...args),
  useListCards: (...args: unknown[]) => mockUseListCards(...args),
  useListPairs: (...args: unknown[]) => mockUseListPairs(...args),
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    listDeckSets: (...args: unknown[]) => mockListDeckSets(...args),
    listDeckEntries: (...args: unknown[]) => mockListDeckEntries(...args),
  },
}));

jest.mock("@/lib/card-thumbnail-cache", () => ({
  getCardThumbnailUrl: (...args: unknown[]) => mockGetCardThumbnailUrl(...args),
}));

jest.mock("@/components/Decks/hooks/useDeckMutations", () => ({
  useDeckMutations: (...args: unknown[]) => mockUseDeckMutations(...args),
}));

describe("useDecksGridModel", () => {
  const hookArgs = {
    untitledDeckLabel: "Untitled",
    saveTitleErrorLabel: "Failed to save title",
  };
  const refetch = jest.fn();
  const createDeck = jest.fn();
  const updateDeck = jest.fn();
  const updateDeckTitle = jest.fn();
  const deleteDecks = jest.fn();
  const duplicateDeck = jest.fn();

  const flushDebouncedTitleSave = async () => {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(250);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseListDecks.mockReturnValue({
      data: [{ id: "d1", title: "Deck 1", updatedAt: 1 }],
      isLoading: false,
      refetch,
    });
    mockUseDeckMutations.mockReturnValue({
      createDeck,
      updateDeck,
      updateDeckTitle,
      deleteDecks,
      duplicateDeck,
    });
    mockUseListCards.mockReturnValue({
      data: [],
      isLoading: false,
      refetch,
    });
    mockUseListPairs.mockReturnValue({
      data: [],
      isLoading: false,
      refetch,
    });
    mockListDeckSets.mockResolvedValue([]);
    mockListDeckEntries.mockResolvedValue([]);
    mockGetCardThumbnailUrl.mockResolvedValue(null);
    refetch.mockResolvedValue({
      data: [{ id: "d1", title: "Deck 1", updatedAt: 1 }],
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("loads decks", async () => {
    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    await waitFor(() => {
      expect(result.current.decks).toEqual([{ id: "d1", title: "Deck 1", updatedAt: 1 }]);
    });
  });

  it("preserves single-select and modifier toggle behavior", async () => {
    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    act(() => {
      result.current.selectDeck("d1", false);
    });
    expect(result.current.selectedDeckId).toBe("d1");

    act(() => {
      result.current.selectDeck("d1", false);
    });
    expect(result.current.selectedDeckId).toBeNull();
  });

  it("createDeck refreshes and selects created deck", async () => {
    createDeck.mockResolvedValue("d2");
    refetch.mockResolvedValue({
      data: [{ id: "d2", title: "Deck 2", updatedAt: 2 }],
    });

    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    await act(async () => {
      await result.current.createDeck();
    });

    expect(createDeck).toHaveBeenCalled();
    expect(refetch).toHaveBeenCalled();
    expect(result.current.selectedDeckId).toBe("d2");
  });

  it("beginCreateDeckDraft clears drafts and target", async () => {
    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );
    act(() => {
      result.current.setDeckTitleDraft("X");
      result.current.setDeckDescriptionDraft("Y");
      result.current.beginCreateDeckDraft();
    });
    expect(result.current.deckDraftTargetId).toBeNull();
    expect(result.current.deckTitleDraft).toBe("");
    expect(result.current.deckDescriptionDraft).toBe("");
  });

  it("beginEditDeckDraft preloads title/description", async () => {
    mockUseListDecks.mockReturnValue({
      data: [{ id: "d1", title: "Deck 1", description: "Desc", updatedAt: 1 }],
      isLoading: false,
      refetch,
    });
    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );
    let opened = false;
    act(() => {
      opened = result.current.beginEditDeckDraft("d1");
    });
    expect(opened).toBe(true);
    expect(result.current.deckDraftTargetId).toBe("d1");
    expect(result.current.deckTitleDraft).toBe("Deck 1");
    expect(result.current.deckDescriptionDraft).toBe("Desc");
  });

  it("submitDeckDraft updates existing deck in edit mode", async () => {
    updateDeck.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );
    act(() => {
      result.current.beginEditDeckDraft("d1");
      result.current.setDeckTitleDraft("Deck Updated");
      result.current.setDeckDescriptionDraft("Updated description");
    });
    await act(async () => {
      await result.current.submitDeckDraft();
    });
    expect(updateDeck).toHaveBeenCalledWith("d1", "Deck Updated", "Updated description", "Untitled");
    expect(refetch).toHaveBeenCalled();
  });

  it("initializes rename draft from single selected deck and gates actions by selection", async () => {
    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    expect(result.current.canRenameDeck).toBe(false);
    expect(result.current.canDeleteDecks).toBe(false);
    expect(result.current.selectedDeckTitleDraft).toBe("");

    act(() => {
      result.current.selectDeck("d1", false);
    });
    expect(result.current.canRenameDeck).toBe(true);
    expect(result.current.canDeleteDecks).toBe(true);
    expect(result.current.selectedDeckTitleDraft).toBe("Deck 1");
    expect(result.current.effectiveDeckTitleById.d1).toBe("Deck 1");
  });

  it("commits title updates and falls back to untitled when blank", async () => {
    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    act(() => {
      result.current.selectDeck("d1", false);
    });
    await waitFor(() => {
      expect(result.current.selectedDeckTitleDraft).toBe("Deck 1");
    });
    act(() => {
      result.current.startDeckTitleEdit();
      result.current.setSelectedDeckTitleDraft("  ");
    });

    await act(async () => {
      await result.current.commitDeckTitleEdit();
    });

    expect(updateDeckTitle).toHaveBeenCalledWith("d1", "  ", "Untitled");
    expect(refetch).toHaveBeenCalled();
  });

  it("cancels title edits and resets draft", async () => {
    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    act(() => {
      result.current.selectDeck("d1", false);
      result.current.startDeckTitleEdit();
      result.current.setSelectedDeckTitleDraft("Changed");
      result.current.cancelDeckTitleEdit();
    });

    expect(result.current.selectedDeckTitleDraft).toBe("Deck 1");
    expect(result.current.isDeckTitleEditing).toBe(false);
    expect(updateDeckTitle).not.toHaveBeenCalled();
  });

  it("disables rename for multi-select and keeps delete enabled", async () => {
    mockUseListDecks.mockReturnValue({
      data: [
        { id: "d1", title: "Deck 1", updatedAt: 1 },
        { id: "d2", title: "Deck 2", updatedAt: 2 },
      ],
      isLoading: false,
      refetch,
    });

    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    act(() => {
      result.current.selectDeck("d1", false);
      result.current.selectDeck("d2", true);
    });

    expect(result.current.canRenameDeck).toBe(false);
    expect(result.current.canDeleteDecks).toBe(true);
    expect(result.current.startDeckTitleEdit()).toBe(false);
  });

  it("updates effective title immediately and persists with debounce", async () => {
    updateDeckTitle.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    act(() => {
      result.current.selectDeck("d1", false);
    });
    await waitFor(() => {
      expect(result.current.canRenameDeck).toBe(true);
      expect(result.current.selectedDeckTitleDraft).toBe("Deck 1");
    });
    act(() => {
      result.current.onDeckTitleDraftChangeLive("Deck 1 Updated");
    });

    expect(result.current.selectedDeckTitleDraft).toBe("Deck 1 Updated");
    expect(result.current.effectiveDeckTitleById.d1).toBe("Deck 1 Updated");
    expect(updateDeckTitle).not.toHaveBeenCalled();

    await flushDebouncedTitleSave();

    expect(updateDeckTitle).toHaveBeenCalledWith("d1", "Deck 1 Updated", "Untitled");
  });

  it("shows untitled label in effective map when selected draft is empty", async () => {
    const { result } = renderHook(() =>
      useDecksGridModel({
        untitledDeckLabel: "Untitled deck",
        saveTitleErrorLabel: "Failed to save title",
      }),
    );

    act(() => {
      result.current.selectDeck("d1", false);
    });
    await waitFor(() => {
      expect(result.current.canRenameDeck).toBe(true);
    });
    act(() => {
      result.current.onDeckTitleDraftChangeLive("");
    });

    expect(result.current.selectedDeckTitleDraft).toBe("");
    expect(result.current.effectiveDeckTitleById.d1).toBe("Untitled deck");
  });

  it("debounced save uses latest draft value only", async () => {
    updateDeckTitle.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    act(() => {
      result.current.selectDeck("d1", false);
    });
    await waitFor(() => {
      expect(result.current.canRenameDeck).toBe(true);
      expect(result.current.selectedDeckTitleDraft).toBe("Deck 1");
    });
    act(() => {
      result.current.onDeckTitleDraftChangeLive("A");
      result.current.onDeckTitleDraftChangeLive("AB");
      result.current.onDeckTitleDraftChangeLive("ABC");
    });

    await flushDebouncedTitleSave();

    expect(updateDeckTitle).toHaveBeenCalledTimes(1);
    expect(updateDeckTitle).toHaveBeenCalledWith("d1", "ABC", "Untitled");
  });

  it("does not clear the title draft when selected deck is transiently missing during refresh", async () => {
    let decksData: Array<{ id: string; title: string; updatedAt: number }> = [
      { id: "d1", title: "Deck 1", updatedAt: 1 },
    ];
    mockUseListDecks.mockImplementation(() => ({
      data: decksData,
      isLoading: false,
      refetch,
    }));

    const { result, rerender } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    act(() => {
      result.current.selectDeck("d1", false);
    });
    act(() => {
      result.current.startDeckTitleEdit();
      result.current.onDeckTitleDraftChangeLive("Deck 1 Updated");
    });
    expect(result.current.selectedDeckTitleDraft).toBe("Deck 1 Updated");

    decksData = [];
    rerender();
    expect(result.current.selectedDeckTitleDraft).toBe("Deck 1 Updated");

    decksData = [{ id: "d1", title: "Deck 1 Updated", updatedAt: 2 }];
    rerender();
    expect(result.current.selectedDeckTitleDraft).toBe("Deck 1 Updated");
  });

  it("does not live-persist while multi-selected", async () => {
    mockUseListDecks.mockReturnValue({
      data: [
        { id: "d1", title: "Deck 1", updatedAt: 1 },
        { id: "d2", title: "Deck 2", updatedAt: 2 },
      ],
      isLoading: false,
      refetch,
    });

    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    act(() => {
      result.current.selectDeck("d1", false);
      result.current.selectDeck("d2", true);
    });
    await waitFor(() => {
      expect(result.current.canRenameDeck).toBe(false);
    });
    act(() => {
      result.current.onDeckTitleDraftChangeLive("Should Not Persist");
    });

    await flushDebouncedTitleSave();

    expect(updateDeckTitle).not.toHaveBeenCalled();
  });

  it("treats non-array query data as empty decks instead of crashing", async () => {
    mockUseListDecks.mockReturnValue({
      data: { deckId: "unexpected-shape" },
      isLoading: false,
      refetch,
    });
    refetch.mockResolvedValue({ data: { deckId: "unexpected-shape" } });

    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    expect(result.current.decks).toEqual([]);
    await act(async () => {
      const refreshed = await result.current.refresh();
      expect(refreshed).toEqual([]);
    });
  });

  it("filters by deck title with debounced search", async () => {
    mockUseListDecks.mockReturnValue({
      data: [
        { id: "d1", title: "Wizard Deck", updatedAt: 1 },
        { id: "d2", title: "Orc Deck", updatedAt: 2 },
      ],
      isLoading: false,
      refetch,
    });

    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );
    expect(result.current.filteredDecks).toHaveLength(2);

    act(() => {
      result.current.setSearchDraft("wizard");
    });
    expect(result.current.filteredDecks).toHaveLength(2);

    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current.filteredDecks).toHaveLength(1);
    expect(result.current.filteredDecks[0].id).toBe("d1");
  });

  it("keeps selected decks selected when they are filtered out", async () => {
    mockUseListDecks.mockReturnValue({
      data: [
        { id: "d1", title: "Wizard Deck", updatedAt: 1 },
        { id: "d2", title: "Orc Deck", updatedAt: 2 },
      ],
      isLoading: false,
      refetch,
    });
    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    act(() => {
      result.current.selectDeck("d2", false);
      result.current.setSearchDraft("wizard");
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.filteredDecks).toHaveLength(1);
    expect(result.current.filteredDecks[0].id).toBe("d1");
    expect(result.current.selectedDeckIds.has("d2")).toBe(true);
    expect(result.current.selectedCount).toBe(1);
  });

  it("filters by nested card title across deck entries", async () => {
    mockUseListDecks.mockReturnValue({
      data: [{ id: "d1", title: "Alpha", updatedAt: 1 }],
      isLoading: false,
      refetch,
    });
    mockUseListCards.mockReturnValue({
      data: [{ id: "c1", title: "Fire Wizard", name: "Fire Wizard" }],
      isLoading: false,
      refetch,
    });
    mockUseListPairs.mockReturnValue({
      data: [{ id: "p1", frontFaceId: "c1" }],
      isLoading: false,
      refetch,
    });
    mockListDeckSets.mockResolvedValue([{ id: "s1" }]);
    mockListDeckEntries.mockResolvedValue([{ id: "e1", pairId: "p1" }]);

    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    act(() => {
      result.current.setSearchDraft("wizard");
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    await waitFor(() => {
      expect(result.current.filteredDecks).toHaveLength(1);
      expect(result.current.filteredDecks[0].id).toBe("d1");
    });
  });

  it("filters by set back-face title when front/deck title do not match", async () => {
    mockUseListDecks.mockReturnValue({
      data: [{ id: "d1", title: "Alpha", updatedAt: 1 }],
      isLoading: false,
      refetch,
    });
    mockUseListCards.mockReturnValue({
      data: [{ id: "b1", title: "Spell Back", name: "Spell Back" }],
      isLoading: false,
      refetch,
    });
    mockUseListPairs.mockReturnValue({
      data: [],
      isLoading: false,
      refetch,
    });
    mockListDeckSets.mockResolvedValue([{ id: "s1", backFaceId: "b1" }]);
    mockListDeckEntries.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    act(() => {
      result.current.setSearchDraft("spell");
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.filteredDecks).toHaveLength(1);
      expect(result.current.filteredDecks[0].id).toBe("d1");
    });
  });

  it("query spell returns decks matched by deck title, front title, or back-face title", async () => {
    mockUseListDecks.mockReturnValue({
      data: [
        { id: "d1", title: "Spell Deck", updatedAt: 1 },
        { id: "d2", title: "Alpha", updatedAt: 2 },
        { id: "d3", title: "Beta", updatedAt: 3 },
        { id: "d4", title: "Gamma", updatedAt: 4 },
      ],
      isLoading: false,
      refetch,
    });
    mockUseListCards.mockReturnValue({
      data: [
        { id: "f1", title: "Spell Missile", name: "Spell Missile" },
        { id: "b1", title: "Spell Backface", name: "Spell Backface" },
      ],
      isLoading: false,
      refetch,
    });
    mockUseListPairs.mockReturnValue({
      data: [{ id: "p1", frontFaceId: "f1" }],
      isLoading: false,
      refetch,
    });
    mockListDeckSets.mockImplementation(async ({ params }: { params: { deckId: string } }) => {
      if (params.deckId === "d2") return [{ id: "s2", backFaceId: "b1" }];
      if (params.deckId === "d3") return [{ id: "s3", backFaceId: "unknown-back" }];
      if (params.deckId === "d4") return [{ id: "s4", backFaceId: "unknown-back" }];
      return [{ id: "s1", backFaceId: "unknown-back" }];
    });
    mockListDeckEntries.mockImplementation(async ({ params }: { params: { setId: string } }) => {
      if (params.setId === "s3") return [{ id: "e3", pairId: "p1" }];
      return [];
    });

    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    act(() => {
      result.current.setSearchDraft("spell");
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      const ids = result.current.filteredDecks.map((deck) => deck.id);
      expect(ids).toContain("d1");
      expect(ids).toContain("d2");
      expect(ids).toContain("d3");
      expect(ids).not.toContain("d4");
    });
  });

  it("uses key-set back face thumbnail as deck background source when available", async () => {
    mockUseListDecks.mockReturnValue({
      data: [{ id: "d1", title: "Deck 1", keySetId: "s1", updatedAt: 1 }],
      isLoading: false,
      refetch,
    });
    mockUseListCards.mockReturnValue({
      data: [{ id: "b1", title: "Back 1", name: "Back 1" }],
      isLoading: false,
      refetch,
    });
    mockUseListPairs.mockReturnValue({
      data: [],
      isLoading: false,
      refetch,
    });
    mockListDeckSets.mockResolvedValue([{ id: "s1", backFaceId: "b1" }]);
    mockListDeckEntries.mockResolvedValue([]);
    mockGetCardThumbnailUrl.mockResolvedValue("blob:key-back");

    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    await waitFor(() => {
      expect(result.current.deckBackgroundUrlByDeckId.d1).toBe("blob:key-back");
    });
    expect(mockGetCardThumbnailUrl).toHaveBeenCalledWith("b1");
  });

  it("orders filtered decks by updatedAt desc, createdAt desc, title asc (case-insensitive), then id asc", async () => {
    mockUseListDecks.mockReturnValue({
      data: [
        { id: "d6", title: "Gamma", updatedAt: 8, createdAt: 2 },
        { id: "d5", title: "Beta", updatedAt: 8, createdAt: 1 },
        { id: "d4", title: "alpha", updatedAt: 8, createdAt: 1 },
        { id: "d3", title: "Alpha", updatedAt: 8, createdAt: 1 },
        { id: "d2", title: "Alpha", updatedAt: 8, createdAt: 1 },
        { id: "d1", title: "Zeta", updatedAt: 7, createdAt: 9 },
      ],
      isLoading: false,
      refetch,
    });

    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    expect(result.current.filteredDecks.map((deck) => deck.id)).toEqual([
      "d6",
      "d2",
      "d3",
      "d4",
      "d5",
      "d1",
    ]);
  });

  it("preserves comparator ordering after search filtering", async () => {
    mockUseListDecks.mockReturnValue({
      data: [
        { id: "d1", title: "Spell Deck", updatedAt: 10, createdAt: 1 },
        { id: "d2", title: "Spell Alpha", updatedAt: 9, createdAt: 10 },
        { id: "d3", title: "Spell Beta", updatedAt: 9, createdAt: 9 },
      ],
      isLoading: false,
      refetch,
    });

    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    act(() => {
      result.current.setSearchDraft("spell");
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.filteredDecks.map((deck) => deck.id)).toEqual(["d1", "d2", "d3"]);
  });

  it("falls back to first front card thumbnail when key set is unavailable", async () => {
    mockUseListDecks.mockReturnValue({
      data: [{ id: "d1", title: "Deck 1", keySetId: null, updatedAt: 1 }],
      isLoading: false,
      refetch,
    });
    mockUseListCards.mockReturnValue({
      data: [{ id: "f1", title: "Front 1", name: "Front 1" }],
      isLoading: false,
      refetch,
    });
    mockUseListPairs.mockReturnValue({
      data: [{ id: "p1", frontFaceId: "f1" }],
      isLoading: false,
      refetch,
    });
    mockListDeckSets.mockResolvedValue([{ id: "s1", backFaceId: "unknown-back" }]);
    mockListDeckEntries.mockResolvedValue([{ id: "e1", pairId: "p1" }]);
    mockGetCardThumbnailUrl.mockResolvedValue("blob:fallback-front");

    const { result } = renderHook(() =>
      useDecksGridModel(hookArgs),
    );

    await waitFor(() => {
      expect(result.current.deckBackgroundUrlByDeckId.d1).toBe("blob:fallback-front");
    });
    expect(mockGetCardThumbnailUrl).toHaveBeenCalledWith("f1");
  });
});
