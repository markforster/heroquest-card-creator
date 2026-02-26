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
        "actions.recentlyDeleted": "Recently deleted",
        "actions.close": "Close",
      };
      return lookup[key] ?? key;
    },
  }),
}));

describe("StockpileSidebar (UI)", () => {
  it("shows Recently deleted under Unfiled when there are soft-deleted cards", () => {
    const onFilterChange = jest.fn();

    render(
      <StockpileSidebar
        activeFilter={{ type: "all" }}
        onFilterChange={onFilterChange}
        isPairMode={false}
        showMissingArtworkOnly={false}
        collectionsWithMissingArtwork={new Set()}
        selectedIds={[]}
        onClearSelection={() => {}}
        recentCardsCount={0}
        recentlyDeletedCount={2}
        recentlyDeletedTotalCount={2}
        overallCount={0}
        unfiledCount={0}
        visibleCollections={[]}
        collectionCounts={new Map()}
        selectedCountByCollection={new Map()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Recently deleted/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ type: "recentlyDeleted" });
  });

  it("keeps Recently deleted visible even when the filtered badge count is 0", () => {
    render(
      <StockpileSidebar
        activeFilter={{ type: "all" }}
        onFilterChange={() => {}}
        isPairMode={false}
        showMissingArtworkOnly={false}
        collectionsWithMissingArtwork={new Set()}
        selectedIds={[]}
        onClearSelection={() => {}}
        recentCardsCount={0}
        recentlyDeletedCount={0}
        recentlyDeletedTotalCount={2}
        overallCount={0}
        unfiledCount={0}
        visibleCollections={[]}
        collectionCounts={new Map()}
        selectedCountByCollection={new Map()}
      />,
    );

    const recentlyDeletedButton = screen.getByRole("button", { name: /Recently deleted/i });
    expect(recentlyDeletedButton).toBeInTheDocument();
    expect(recentlyDeletedButton).toHaveTextContent("0");
  });

  it("does not show Recently deleted when there are no soft-deleted cards", () => {
    render(
      <StockpileSidebar
        activeFilter={{ type: "all" }}
        onFilterChange={() => {}}
        isPairMode={false}
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

    expect(screen.queryByRole("button", { name: "Recently deleted" })).toBeNull();
  });

  it("hides Recently deleted in pair mode", () => {
    render(
      <StockpileSidebar
        activeFilter={{ type: "all" }}
        onFilterChange={() => {}}
        isPairMode
        showMissingArtworkOnly={false}
        collectionsWithMissingArtwork={new Set()}
        selectedIds={[]}
        onClearSelection={() => {}}
        recentCardsCount={0}
        recentlyDeletedCount={2}
        recentlyDeletedTotalCount={2}
        overallCount={0}
        unfiledCount={0}
        visibleCollections={[]}
        collectionCounts={new Map()}
        selectedCountByCollection={new Map()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Recently deleted" })).toBeNull();
  });
});
