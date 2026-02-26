import { fireEvent, render, screen } from "@testing-library/react";

import StockpileSidebar from "@/components/Stockpile/StockpileSidebar";

jest.mock("@/components/Providers/CollectionsTreeSettingsContext", () => ({
  __esModule: true,
  useCollectionsTreeSettings: () => ({
    enabled: false,
    expandedPaths: new Set<string>(),
    setExpandedPaths: () => {},
    togglePath: () => {},
    hasStoredExpandedPaths: false,
    isReady: true,
  }),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => {
      const lookup: Record<string, string> = {
        "heading.collections": "Collections",
        "actions.recentCards": "Recent cards",
        "actions.allCards": "All cards",
        "actions.unfiled": "Unfiled",
        "actions.close": "Close",
      };
      return lookup[key] ?? key;
    },
  }),
}));

describe("StockpileSidebar (UI)", () => {
  it("renders header actions and triggers close", () => {
    const onRequestClose = jest.fn();

    render(
      <StockpileSidebar
        headerActions={<button type="button">HeaderAction</button>}
        onRequestClose={onRequestClose}
        activeFilter={{ type: "all" }}
        onFilterChange={() => {}}
        isPairMode={false}
        dragEnabled={false}
        showMissingArtworkOnly={false}
        collectionsWithMissingArtwork={new Set()}
        selectedIds={[]}
        onClearSelection={() => {}}
        recentCardsCount={0}
        recentlyDeletedCount={0}
        recentlyDeletedTotalCount={0}
        overallCount={0}
        unfiledCount={0}
        visibleCollections={[]}
        collectionCounts={new Map()}
        selectedCountByCollection={new Map()}
      />,
    );

    expect(screen.getByRole("button", { name: "HeaderAction" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });
});
