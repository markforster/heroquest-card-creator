import { fireEvent, render, screen } from "@testing-library/react";

import StockpileToolbar from "@/components/Stockpile/StockpileToolbar";

jest.mock("@/components/Providers/MissingAssetsContext", () => ({
  __esModule: true,
  useMissingAssets: () => ({
    missingArtworkIds: new Set(),
  }),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    language: "en",
    t: (key: string) => {
      const lookup: Record<string, string> = {
        "heading.collections": "Collections",
        "label.collections": "Collections",
        "tooltip.filterCards": "Filter cards",
        "tooltip.searchCards": "Search cards",
        "placeholders.searchCards": "Search cards...",
        "ui.allTypes": "All types",
        "cardFace.frontFacing": "Front-facing",
        "cardFace.backFacing": "Back-facing",
        "warning.notPaired": "Not paired",
        "label.missingArtwork": "Missing artwork",
        "actions.clear": "Clear",
        "label.gridView": "Grid",
        "label.tableView": "Table",
      };
      return lookup[key] ?? key;
    },
  }),
}));

describe("StockpileToolbar (UI)", () => {
  it("renders a clear button when search is non-empty and clears search on click", () => {
    const onSearchChange = jest.fn();

    render(
      <StockpileToolbar
        onOpenCollections={() => {}}
        collectionsToggleLabel="All cards"
        search="hello"
        onSearchChange={onSearchChange}
        templateFilter="all"
        onTemplateFilterChange={() => {}}
        filterLabel="All types"
        totalCount={0}
        faceCounts={{ front: 0, back: 0 }}
        typeCounts={new Map()}
        isPairMode={false}
        isPairBacks={false}
        isPairFronts={false}
        showUnpairedOnly={false}
        onShowUnpairedOnlyChange={() => {}}
        showMissingArtworkOnly={false}
        onShowMissingArtworkOnlyChange={() => {}}
        selectedCount={0}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onSearchChange).toHaveBeenCalledWith("");
  });
});

