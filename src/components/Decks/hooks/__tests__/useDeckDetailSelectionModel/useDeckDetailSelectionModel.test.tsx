import { act, renderHook } from "@testing-library/react";

import { useDeckDetailSelectionModel } from "@/components/Decks/hooks/useDeckDetailSelectionModel";

const mockUseListDeckGroups = jest.fn();
const mockUseListDeckSets = jest.fn();
const mockUseQueryClient = jest.fn();

jest.mock("@/api/hooks", () => ({
  useListDeckGroups: (...args: unknown[]) => mockUseListDeckGroups(...args),
  useListDeckSets: (...args: unknown[]) => mockUseListDeckSets(...args),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => mockUseQueryClient(),
}));

describe("useDeckDetailSelectionModel", () => {
  const invalidateQueries = jest.fn();
  const refetchQueries = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryClient.mockReturnValue({ invalidateQueries, refetchQueries });
    mockUseListDeckGroups.mockReturnValue({ data: [] });
    mockUseListDeckSets.mockReturnValue({ data: [] });
    invalidateQueries.mockResolvedValue(undefined);
    refetchQueries.mockResolvedValue(undefined);
  });

  it("disables group/set queries when deckId is null", () => {
    renderHook(() => useDeckDetailSelectionModel(null));

    expect(mockUseListDeckGroups).toHaveBeenCalledWith(
      { params: { deckId: "" } },
      expect.objectContaining({ enabled: false }),
    );
    expect(mockUseListDeckSets).toHaveBeenCalledWith(
      { params: { deckId: "" } },
      expect.objectContaining({ enabled: false }),
    );
  });

  it("defaults to first group and auto-selects single set group", () => {
    mockUseListDeckGroups.mockReturnValue({
      data: [
        { id: "g1", title: "Group 1", sortIndex: 1 },
        { id: "g0", title: "Group 0", sortIndex: 0 },
      ],
    });
    mockUseListDeckSets.mockReturnValue({
      data: [{ id: "s1", groupId: "g0", sortIndex: 0, backFaceId: "b1" }],
    });

    const { result } = renderHook(() => useDeckDetailSelectionModel("deck-1"));

    expect(result.current.selectedGroupId).toBe("g0");
    expect(result.current.selectedSetId).toBe("s1");
  });

  it("selectGroup/selectSet update selection and reloadStructure refetches structure queries", async () => {
    mockUseListDeckGroups.mockReturnValue({
      data: [{ id: "g1", title: "Group 1", sortIndex: 0 }],
    });
    mockUseListDeckSets.mockReturnValue({
      data: [
        { id: "s1", groupId: "g1", sortIndex: 0, backFaceId: "b1" },
        { id: "s2", groupId: "g1", sortIndex: 1, backFaceId: "b2" },
      ],
    });

    const { result } = renderHook(() => useDeckDetailSelectionModel("deck-1"));

    act(() => {
      result.current.selectGroup("g1");
    });
    expect(result.current.selectedGroupId).toBe("g1");
    expect(result.current.selectedSetId).toBeNull();

    act(() => {
      result.current.selectSet({
        id: "s2",
        groupId: "g1",
        sortIndex: 1,
        backFaceId: "b2",
      } as never);
    });
    expect(result.current.selectedGroupId).toBe("g1");
    expect(result.current.selectedSetId).toBe("s2");

    await act(async () => {
      await result.current.reloadStructure("s2");
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(refetchQueries).toHaveBeenCalledTimes(1);
  });
});
