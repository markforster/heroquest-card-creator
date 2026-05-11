import { act, renderHook, waitFor } from "@testing-library/react";

import { useDecksGridModel } from "@/components/Decks/hooks/useDecksGridModel";

const mockUseListDecks = jest.fn();
const mockUseDeckMutations = jest.fn();
const mockListDeckGroups = jest.fn();
const mockListDeckSets = jest.fn();
const mockListDeckEntries = jest.fn();

jest.mock("@/api/hooks", () => ({
  useListDecks: (...args: unknown[]) => mockUseListDecks(...args),
}));

jest.mock("@/components/Decks/hooks/useDeckMutations", () => ({
  useDeckMutations: (...args: unknown[]) => mockUseDeckMutations(...args),
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    listDeckGroups: (...args: unknown[]) => mockListDeckGroups(...args),
    listDeckSets: (...args: unknown[]) => mockListDeckSets(...args),
    listDeckEntries: (...args: unknown[]) => mockListDeckEntries(...args),
  },
}));

describe("useDecksGridModel", () => {
  const refetch = jest.fn();
  const createDeck = jest.fn();
  const updateDeckTitle = jest.fn();
  const deleteDecks = jest.fn();
  const duplicateDeck = jest.fn();
  const listPairsMap = jest.fn();

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
      updateDeckTitle,
      deleteDecks,
      duplicateDeck,
      listPairsMap,
    });
    listPairsMap.mockResolvedValue(new Map([["p1", { id: "p1", frontFaceId: "f1" }]]));
    mockListDeckGroups.mockResolvedValue([{ id: "g1", sortIndex: 0 }]);
    mockListDeckSets.mockResolvedValue([{ id: "s1", groupId: "g1", backFaceId: "b1", sortIndex: 0 }]);
    mockListDeckEntries.mockResolvedValue([{ id: "e1", pairId: "p1", sortIndex: 0 }]);
    refetch.mockResolvedValue({
      data: [{ id: "d1", title: "Deck 1", updatedAt: 1 }],
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("loads decks and computes previews", async () => {
    const { result } = renderHook(() =>
      useDecksGridModel({ previewFanCount: 5, untitledDeckLabel: "Untitled" }),
    );

    await waitFor(() => {
      expect(result.current.deckPreviews.d1).toEqual(["b1", "f1"]);
    });
  });

  it("preserves single-select and modifier toggle behavior", async () => {
    const { result } = renderHook(() =>
      useDecksGridModel({ previewFanCount: 5, untitledDeckLabel: "Untitled" }),
    );
    await waitFor(() => {
      expect(listPairsMap).toHaveBeenCalled();
    });

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
      useDecksGridModel({ previewFanCount: 5, untitledDeckLabel: "Untitled" }),
    );
    await waitFor(() => {
      expect(listPairsMap).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.createDeck();
    });

    expect(createDeck).toHaveBeenCalled();
    expect(refetch).toHaveBeenCalled();
    expect(result.current.selectedDeckId).toBe("d2");
  });

  it("initializes rename draft from single selected deck and gates actions by selection", async () => {
    const { result } = renderHook(() =>
      useDecksGridModel({ previewFanCount: 5, untitledDeckLabel: "Untitled" }),
    );
    await waitFor(() => {
      expect(listPairsMap).toHaveBeenCalled();
    });

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
      useDecksGridModel({ previewFanCount: 5, untitledDeckLabel: "Untitled" }),
    );
    await waitFor(() => {
      expect(listPairsMap).toHaveBeenCalled();
    });

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
      useDecksGridModel({ previewFanCount: 5, untitledDeckLabel: "Untitled" }),
    );
    await waitFor(() => {
      expect(listPairsMap).toHaveBeenCalled();
    });

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
      useDecksGridModel({ previewFanCount: 5, untitledDeckLabel: "Untitled" }),
    );
    await waitFor(() => {
      expect(listPairsMap).toHaveBeenCalled();
    });

    act(() => {
      result.current.selectDeck("d1", false);
      result.current.selectDeck("d2", true);
    });

    expect(result.current.canRenameDeck).toBe(false);
    expect(result.current.canDeleteDecks).toBe(true);
    expect(result.current.startDeckTitleEdit()).toBe(false);
  });

  it("updates effective title immediately and persists with debounce", async () => {
    const { result } = renderHook(() =>
      useDecksGridModel({ previewFanCount: 5, untitledDeckLabel: "Untitled" }),
    );
    await waitFor(() => {
      expect(listPairsMap).toHaveBeenCalled();
    });

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

    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    expect(updateDeckTitle).toHaveBeenCalledWith("d1", "Deck 1 Updated", "Untitled");
  });

  it("shows untitled label in effective map when selected draft is empty", async () => {
    const { result } = renderHook(() =>
      useDecksGridModel({ previewFanCount: 5, untitledDeckLabel: "Untitled deck" }),
    );
    await waitFor(() => {
      expect(listPairsMap).toHaveBeenCalled();
    });

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
    const { result } = renderHook(() =>
      useDecksGridModel({ previewFanCount: 5, untitledDeckLabel: "Untitled" }),
    );
    await waitFor(() => {
      expect(listPairsMap).toHaveBeenCalled();
    });

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

    await act(async () => {
      jest.advanceTimersByTime(250);
    });

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
      useDecksGridModel({ previewFanCount: 5, untitledDeckLabel: "Untitled" }),
    );
    await waitFor(() => {
      expect(listPairsMap).toHaveBeenCalled();
    });

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
      useDecksGridModel({ previewFanCount: 5, untitledDeckLabel: "Untitled" }),
    );
    await waitFor(() => {
      expect(listPairsMap).toHaveBeenCalled();
    });

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

    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    expect(updateDeckTitle).not.toHaveBeenCalled();
  });
});
