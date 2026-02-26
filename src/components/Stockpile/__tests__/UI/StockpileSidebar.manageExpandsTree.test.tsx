import { render, waitFor } from "@testing-library/react";

import StockpileSidebar from "@/components/Stockpile/StockpileSidebar";

const setExpandedPaths = jest.fn();

jest.mock("@/components/Providers/CollectionsTreeSettingsContext", () => ({
  __esModule: true,
  useCollectionsTreeSettings: () => ({
    enabled: true,
    expandedPaths: new Set(["Foo"]),
    setExpandedPaths,
    togglePath: jest.fn(),
    hasStoredExpandedPaths: true,
    isReady: true,
  }),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => {
      const lookup: Record<string, string> = {
        "heading.collections": "Collections",
        "actions.recentCards": "Recent",
        "actions.allCards": "All cards",
        "actions.unfiled": "Unfiled",
        "actions.close": "Close",
        "actions.editCollection": "Edit collection",
        "actions.delete": "Delete",
      };
      return lookup[key] ?? key;
    },
  }),
}));

describe("StockpileSidebar (UI)", () => {
  beforeEach(() => {
    setExpandedPaths.mockClear();
  });

  it("forces full tree expand in manage mode and restores on exit", async () => {
    const baseProps = {
      activeFilter: { type: "collection" as const, id: "col-1" },
      onFilterChange: jest.fn(),
      isPairMode: false,
      showMissingArtworkOnly: false,
      collectionsWithMissingArtwork: new Set<string>(),
      selectedIds: [],
      onClearSelection: jest.fn(),
      recentCardsCount: 0,
      recentlyDeletedCount: 0,
      recentlyDeletedTotalCount: 0,
      overallCount: 0,
      unfiledCount: 0,
      visibleCollections: [{ id: "col-1", name: "Foo/Bar", cardIds: [] }],
      collectionCounts: new Map([["col-1", 1]]),
      selectedCountByCollection: new Map<string, number>(),
    };

    const { rerender } = render(<StockpileSidebar {...baseProps} isManagingCollections={false} />);

    rerender(<StockpileSidebar {...baseProps} isManagingCollections />);

    await waitFor(() => {
      expect(setExpandedPaths).toHaveBeenCalled();
    });
    expect(setExpandedPaths.mock.calls[0][0]).toEqual(["Foo"]);

    rerender(<StockpileSidebar {...baseProps} isManagingCollections={false} />);

    await waitFor(() => {
      expect(setExpandedPaths).toHaveBeenCalledTimes(2);
    });
    expect(Array.from(setExpandedPaths.mock.calls[1][0])).toEqual(["Foo"]);
  });
});
