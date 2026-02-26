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
        "actions.editCollection": "Edit collection",
        "actions.delete": "Delete",
      };
      return lookup[key] ?? key;
    },
  }),
}));

describe("StockpileSidebar (UI)", () => {
  it("renders per-collection edit/delete actions without changing filter", () => {
    const onEditCollection = jest.fn();
    const onDeleteCollection = jest.fn();
    const onFilterChange = jest.fn();

    render(
      <StockpileSidebar
        onEditCollection={onEditCollection}
        onDeleteCollection={onDeleteCollection}
        isManagingCollections
        activeFilter={{ type: "all" }}
        onFilterChange={onFilterChange}
        isPairMode={false}
        dragEnabled={false}
        showMissingArtworkOnly={false}
        collectionsWithMissingArtwork={new Set()}
        selectedIds={[]}
        onClearSelection={() => {}}
        recentCardsCount={0}
        recentlyDeletedCount={0}
        recentlyDeletedTotalCount={0}
        overallCount={1}
        unfiledCount={0}
        visibleCollections={[{ id: "col-1", name: "My Collection", cardIds: [] }]}
        collectionCounts={new Map([["col-1", 0]])}
        selectedCountByCollection={new Map()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit collection" }));
    expect(onEditCollection).toHaveBeenCalledWith("col-1");
    expect(onFilterChange).not.toHaveBeenCalled();

    const editButton = screen.getByRole("button", { name: "Edit collection" });
    expect(editButton.className).toContain("stockpileSidebarItemActionButtonEdit");

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDeleteCollection).toHaveBeenCalledWith("col-1");
    expect(onFilterChange).not.toHaveBeenCalled();

    const deleteButton = screen.getByRole("button", { name: "Delete" });
    expect(deleteButton.className).toContain("stockpileSidebarItemActionButtonDelete");
  });
});
