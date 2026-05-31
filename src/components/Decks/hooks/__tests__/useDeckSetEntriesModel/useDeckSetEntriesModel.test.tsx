import { renderHook } from "@testing-library/react";

import { useDeckSetEntriesModel } from "@/components/Decks/hooks/useDeckSetEntriesModel";

const mockUseGetDeckSet = jest.fn();
const mockUseListDeckEntries = jest.fn();
const mockUseListPairs = jest.fn();
const mockUseQueryClient = jest.fn();
const mockAddDeckEntries = jest.fn();
const mockRemoveDeckEntries = jest.fn();
const mockReorderDeckEntries = jest.fn();
const mockUpdateDeckEntryCount = jest.fn();

jest.mock("@/api/hooks", () => ({
  useGetDeckSet: (...args: unknown[]) => mockUseGetDeckSet(...args),
  useListDeckEntries: (...args: unknown[]) => mockUseListDeckEntries(...args),
  useListPairs: (...args: unknown[]) => mockUseListPairs(...args),
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    addDeckEntries: (...args: unknown[]) => mockAddDeckEntries(...args),
    removeDeckEntries: (...args: unknown[]) => mockRemoveDeckEntries(...args),
    reorderDeckEntries: (...args: unknown[]) => mockReorderDeckEntries(...args),
    updateDeckEntryCount: (...args: unknown[]) => mockUpdateDeckEntryCount(...args),
  },
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => mockUseQueryClient(),
}));

describe("useDeckSetEntriesModel", () => {
  const invalidateQueries = jest.fn();
  const refetchQueries = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryClient.mockReturnValue({ invalidateQueries, refetchQueries });
    mockUseGetDeckSet.mockReturnValue({ data: null });
    mockUseListDeckEntries.mockReturnValue({ data: [] });
    mockUseListPairs.mockReturnValue({ data: [] });
    mockAddDeckEntries.mockResolvedValue([]);
    mockRemoveDeckEntries.mockResolvedValue(undefined);
    mockReorderDeckEntries.mockResolvedValue(undefined);
    mockUpdateDeckEntryCount.mockResolvedValue(undefined);
    invalidateQueries.mockResolvedValue(undefined);
    refetchQueries.mockResolvedValue(undefined);
  });

  it("disables set/entries/pairs queries when setId is null", () => {
    renderHook(() => useDeckSetEntriesModel(null));

    expect(mockUseGetDeckSet).toHaveBeenCalledWith(
      { params: { setId: "" } },
      expect.objectContaining({ enabled: false }),
    );
    expect(mockUseListDeckEntries).toHaveBeenCalledWith(
      { params: { setId: "" } },
      expect.objectContaining({ enabled: false }),
    );
    expect(mockUseListPairs).toHaveBeenCalledWith(
      { queries: { faceId: "" } },
      expect.objectContaining({ enabled: false }),
    );
  });

  it("derives paired-not-in-set front ids from backFaceId + entries", () => {
    mockUseGetDeckSet.mockReturnValue({ data: { id: "set-1", backFaceId: "back-1" } });
    mockUseListDeckEntries.mockReturnValue({
      data: [{ id: "entry-1", pairId: "pair-1", setId: "set-1", sortIndex: 0, count: 1 }],
    });
    mockUseListPairs.mockReturnValue({
      data: [
        { id: "pair-1", backFaceId: "back-1", frontFaceId: "front-1" },
        { id: "pair-2", backFaceId: "back-1", frontFaceId: "front-2" },
        { id: "pair-3", backFaceId: "back-2", frontFaceId: "front-3" },
      ],
    });

    const { result } = renderHook(() => useDeckSetEntriesModel("set-1"));

    expect(result.current.pairedNotInSetFrontIds).toEqual(["front-2"]);
    expect(result.current.entryFrontIdByEntryId.get("entry-1")).toBe("front-1");
  });

  it("add/remove/reorder invalidate and refetch deck entries exactly once", async () => {
    mockAddDeckEntries.mockResolvedValue([
      { id: "entry-2", pairId: "pair-2", setId: "set-1", sortIndex: 0, count: 1 },
    ]);

    const { result } = renderHook(() => useDeckSetEntriesModel("set-1"));

    await result.current.addFront("front-2");
    expect(mockAddDeckEntries).toHaveBeenCalledWith(
      { frontFaceIds: ["front-2"] },
      { params: { setId: "set-1" } },
    );

    await result.current.removeEntry("entry-1");
    expect(mockRemoveDeckEntries).toHaveBeenCalledWith(
      { entryIds: ["entry-1"] },
      { params: { setId: "set-1" } },
    );

    await result.current.reorderEntries(["entry-2", "entry-1"]);
    expect(mockReorderDeckEntries).toHaveBeenCalledWith(
      { orderedEntryIds: ["entry-2", "entry-1"] },
      { params: { setId: "set-1" } },
    );

    await result.current.updateEntryCount("entry-2", 3);
    expect(mockUpdateDeckEntryCount).toHaveBeenCalledWith(
      { entryId: "entry-2", count: 3 },
      { params: { setId: "set-1" } },
    );

    expect(invalidateQueries).toHaveBeenCalledTimes(8);
    expect(refetchQueries).toHaveBeenCalledTimes(8);
  });
});
