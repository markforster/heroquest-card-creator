const useDeckRightPanel = jest.fn();
const useStockpileFilters = jest.fn();
const toGroupsBoardModel = jest.fn((value) => ({ kind: "groups", value }));
const toEntriesBoardModel = jest.fn((value) => ({ kind: "entries", value }));
const toSourceBoardModel = jest.fn((value) => ({ kind: "source", value }));

jest.mock("@/components/Decks/detail/context/DeckRightPanelContext", () => ({
  useDeckRightPanel: () => useDeckRightPanel(),
}));

jest.mock("@/components/Stockpile/hooks/useStockpileFilters", () => ({
  useStockpileFilters: (...args: unknown[]) => useStockpileFilters(...args),
}));

jest.mock("@/components/Decks/detail/DeckGroupsSection2", () => ({
  toGroupsBoardModel: (args: unknown) => toGroupsBoardModel(args),
  toEntriesBoardModel: (args: unknown) => toEntriesBoardModel(args),
  toSourceBoardModel: (args: unknown) => toSourceBoardModel(args),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

import { renderHook } from "@testing-library/react";

import { useDeckBoardsModels } from "@/components/Decks/detail/DeckGroupsSection2.models";

describe("useDeckBoardsModels", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDeckRightPanel.mockReturnValue({
      rightPanelFaceMode: "back",
      backCards: [
        { id: "used-back", name: "Used" },
        { id: "available-back", name: "Available" },
      ],
      backCollections: [],
      sourceSearch: "",
      backFilter: { type: "all" },
    });
    useStockpileFilters.mockImplementation(({ cards }) => ({ filteredCards: cards }));
  });

  it("excludes backs already assigned to sets and builds all three board models", () => {
    const selection = {
      sets: [
        {
          id: "set-1",
          groupId: "group-1",
          sortIndex: 0,
          title: "Set",
          backFaceId: "used-back",
        },
      ],
      orderedGroups: [{ id: "group-1", title: "Group" }],
    };
    const entries = {
      entries: [],
      entriesSorted: [],
      entryFrontIdByEntryId: new Map(),
    };

    const { result } = renderHook(() =>
      useDeckBoardsModels({ selection: selection as never, entries: entries as never }),
    );

    expect(useStockpileFilters).toHaveBeenCalledWith(
      expect.objectContaining({ cards: [{ id: "available-back", name: "Available" }] }),
    );
    expect(toGroupsBoardModel).toHaveBeenCalled();
    expect(toEntriesBoardModel).toHaveBeenCalled();
    expect(toSourceBoardModel).toHaveBeenCalledWith(
      expect.objectContaining({
        cards: [{ id: "available-back", name: "Available" }],
        sourceFaceMode: "back",
      }),
    );
    expect(result.current).toEqual({
      groups: expect.objectContaining({ kind: "groups" }),
      entries: expect.objectContaining({ kind: "entries" }),
      source: expect.objectContaining({ kind: "source" }),
    });
  });

  it("excludes fronts already represented by entries in front mode", () => {
    useDeckRightPanel.mockReturnValue({
      rightPanelFaceMode: "front",
      backCards: [
        { id: "used-front", name: "Used" },
        { id: "available-front", name: "Available" },
      ],
      backCollections: [],
      sourceSearch: "",
      backFilter: { type: "all" },
    });
    const entries = {
      entries: [{ id: "entry-1" }],
      entriesSorted: [{ id: "entry-1", sortIndex: 0 }],
      entryFrontIdByEntryId: new Map([["entry-1", "used-front"]]),
    };

    renderHook(() =>
      useDeckBoardsModels({
        selection: { sets: [], orderedGroups: [] } as never,
        entries: entries as never,
      }),
    );

    expect(useStockpileFilters).toHaveBeenCalledWith(
      expect.objectContaining({ cards: [{ id: "available-front", name: "Available" }] }),
    );
  });
});
