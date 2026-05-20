import { renderHook } from "@testing-library/react";

const mockUseQueryClient = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => mockUseQueryClient(),
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    createDeck: jest.fn(),
    updateDeck: jest.fn(),
    deleteDeck: jest.fn(),
    duplicateDeck: jest.fn(),
    createDeckSet: jest.fn(),
    listPairs: jest.fn(),
    addDeckEntries: jest.fn(),
    listDeckEntries: jest.fn(),
    removeDeckEntries: jest.fn(),
    deleteDeckSet: jest.fn(),
    deleteDeckGroup: jest.fn(),
    rebuildDeckSetBack: jest.fn(),
    reorderDeckEntries: jest.fn(),
    createDeckGroup: jest.fn(),
    reorderDeckGroups: jest.fn(),
    reorderDeckSets: jest.fn(),
    updateDeckSet: jest.fn(),
  },
}));

import { apiClient } from "@/api/client";
import { useDeckMutations } from "@/components/Decks/hooks/useDeckMutations";

const mockApiClient = apiClient as unknown as Record<string, jest.Mock>;

describe("useDeckMutations", () => {
  const invalidateQueries = jest.fn();
  const refetchQueries = jest.fn();
  const setQueriesData = jest.fn();

  beforeEach(() => {
    Object.values(mockApiClient).forEach((fn) => fn.mockReset());
    invalidateQueries.mockReset();
    refetchQueries.mockReset();
    setQueriesData.mockReset();
    invalidateQueries.mockResolvedValue(undefined);
    refetchQueries.mockResolvedValue(undefined);
    mockUseQueryClient.mockReturnValue({ invalidateQueries, refetchQueries, setQueriesData });
  });

  it("addFrontToSetAndRefresh refreshes entries and pairs", async () => {
    mockApiClient.addDeckEntries.mockResolvedValue(undefined);
    mockApiClient.listDeckEntries.mockResolvedValue([{ id: "e1" }]);
    mockApiClient.listPairs.mockResolvedValue([{ id: "p1", frontFaceId: "f1", backFaceId: "b1" }]);

    const { result } = renderHook(() => useDeckMutations());
    const response = await result.current.addFrontToSetAndRefresh("set-1", "front-1");

    expect(mockApiClient.addDeckEntries).toHaveBeenCalledWith(
      { frontFaceIds: ["front-1"] },
      { params: { setId: "set-1" } },
    );
    expect(mockApiClient.listDeckEntries).toHaveBeenCalledWith({ params: { setId: "set-1" } });
    expect(response.entries).toEqual([{ id: "e1" }]);
    expect(response.pairsById.get("p1")?.frontFaceId).toBe("f1");
  });

  it("removeEntryAndRefresh removes and reloads entries", async () => {
    mockApiClient.removeDeckEntries.mockResolvedValue(undefined);
    mockApiClient.listDeckEntries.mockResolvedValue([{ id: "e2" }]);

    const { result } = renderHook(() => useDeckMutations());
    const entries = await result.current.removeEntryAndRefresh("entry-1", "set-1");

    expect(mockApiClient.removeDeckEntries).toHaveBeenCalledWith(
      { entryIds: ["entry-1"] },
      { params: { setId: "set-1" } },
    );
    expect(entries).toEqual([{ id: "e2" }]);
  });

  it("createSetFromBackFace bootstraps paired fronts", async () => {
    mockApiClient.createDeckSet.mockResolvedValue({ id: "set-2" });
    mockApiClient.listPairs.mockResolvedValue([
      { id: "p1", backFaceId: "back-1", frontFaceId: "front-1" },
      { id: "p2", backFaceId: "back-2", frontFaceId: "front-2" },
    ]);
    mockApiClient.addDeckEntries.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeckMutations());
    const created = await result.current.createSetFromBackFace("deck-1", "group-1", "back-1");

    expect(mockApiClient.createDeckSet).toHaveBeenCalledWith({
      deckId: "deck-1",
      groupId: "group-1",
      backFaceId: "back-1",
      description: null,
    });
    expect(mockApiClient.addDeckEntries).toHaveBeenCalledWith(
      { frontFaceIds: ["front-1"] },
      { params: { setId: "set-2" } },
    );
    expect(created).toEqual({ id: "set-2" });
  });

  it("deleteDecks issues one delete call per deck", async () => {
    mockApiClient.deleteDeck.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeckMutations());

    await result.current.deleteDecks(["d1", "d2"]);

    expect(mockApiClient.deleteDeck).toHaveBeenCalledTimes(2);
    expect(mockApiClient.deleteDeck).toHaveBeenNthCalledWith(1, undefined, { params: { deckId: "d1" } });
    expect(mockApiClient.deleteDeck).toHaveBeenNthCalledWith(2, undefined, { params: { deckId: "d2" } });
  });

  it("updateDeckTitle preserves empty string titles", async () => {
    mockApiClient.updateDeck.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeckMutations());

    await result.current.updateDeckTitle("d1", "", "Untitled");

    expect(mockApiClient.updateDeck).toHaveBeenCalledWith(
      { title: "" },
      { params: { deckId: "d1" } },
    );
  });

  it("updateDeck normalizes title fallback and blank description", async () => {
    mockApiClient.updateDeck.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeckMutations());

    await result.current.updateDeck("d1", "   ", "   ", "Untitled");

    expect(mockApiClient.updateDeck).toHaveBeenCalledWith(
      { title: "Untitled", description: null },
      { params: { deckId: "d1" } },
    );
  });

  it("setDeckKeySet updates cache then invalidates deck queries", async () => {
    mockApiClient.updateDeck.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeckMutations());

    await result.current.setDeckKeySet("d1", "set-22");

    expect(setQueriesData).toHaveBeenCalledTimes(1);
    expect(mockApiClient.updateDeck).toHaveBeenCalledWith(
      { keySetId: "set-22" },
      { params: { deckId: "d1" } },
    );
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(refetchQueries).toHaveBeenCalledTimes(1);
  });
});
