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
  const deleteDecks = jest.fn();
  const duplicateDeck = jest.fn();
  const listPairsMap = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseListDecks.mockReturnValue({
      data: [{ id: "d1", title: "Deck 1", updatedAt: 1 }],
      isLoading: false,
      refetch,
    });
    mockUseDeckMutations.mockReturnValue({
      createDeck,
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
});
