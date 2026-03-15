import { fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";

import StockpileSidebar from "@/components/Stockpile/StockpileSidebar";

const togglePathSpy = jest.fn();
const setExpandedPathsSpy = jest.fn();

jest.mock("@/components/Providers/CollectionsTreeSettingsContext", () => ({
  __esModule: true,
  useCollectionsTreeSettings: () => {
    // Provide a stateful mock so UI updates reflect expanded path changes.
    const [expandedPaths, setExpandedPathsState] = React.useState<Set<string>>(
      () => new Set<string>(["A", "A/B"]),
    );

    return {
      enabled: true,
      expandedPaths,
      setExpandedPaths: (next: Iterable<string>) => {
        setExpandedPathsSpy(next);
        setExpandedPathsState(new Set(next));
      },
      togglePath: (pathId: string) => {
        togglePathSpy(pathId);
        setExpandedPathsState((prev) => {
          const next = new Set(prev);
          if (next.has(pathId)) {
            next.delete(pathId);
          } else {
            next.add(pathId);
          }
          return next;
        });
      },
      hasStoredExpandedPaths: true,
      isReady: true,
    };
  },
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
        "actions.collapseAll": "Collapse all",
        "actions.expandAll": "Expand all",
      };
      return lookup[key] ?? key;
    },
  }),
}));

describe("StockpileSidebar (UI)", () => {
  beforeEach(() => {
    togglePathSpy.mockClear();
    setExpandedPathsSpy.mockClear();
  });

  it("persists Collapse all / Expand all via footer toolbar", () => {
    render(
      <StockpileSidebar
        footerActions={<div data-testid="footer-actions" />}
        isManagingCollections={false}
        activeFilter={{ type: "collection", id: "col-1" }}
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
        overallCount={1}
        unfiledCount={0}
        visibleCollections={[
          { id: "col-1", name: "A/B/One", cardIds: [] },
          { id: "col-2", name: "C/Two", cardIds: [] },
        ]}
        collectionCounts={new Map([
          ["col-1", 0],
          ["col-2", 0],
        ])}
        selectedCountByCollection={new Map()}
      />,
    );

    const folderA = screen.getByRole("button", { name: /^A\b/i });
    const folderB = screen.getByRole("button", { name: /^B\b/i });
    const folderC = screen.getByRole("button", { name: /^C\b/i });
    const collapseButton = screen.getByRole("button", { name: "Collapse all" });
    const expandButton = screen.getByRole("button", { name: "Expand all" });

    // Initial state from the stateful mock includes A and A/B expanded.
    expect(folderA).toHaveAttribute("aria-expanded", "true");
    expect(folderB).toHaveAttribute("aria-expanded", "true");
    expect(folderC).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTitle("A/B/One")).toBeInTheDocument();

    expect(collapseButton.className).toContain("stockpileCollectionsFooterButtonActive");
    expect(expandButton.className).not.toContain("stockpileCollectionsFooterButtonActive");

    fireEvent.click(collapseButton);

    expect(collapseButton.className).toContain("stockpileCollectionsFooterButtonActive");
    expect(expandButton.className).not.toContain("stockpileCollectionsFooterButtonActive");

    // Collapse keeps the selected collection context expanded.
    expect(folderA).toHaveAttribute("aria-expanded", "true");
    expect(folderB).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTitle("A/B/One")).toBeInTheDocument();

    fireEvent.click(expandButton);

    expect(expandButton.className).toContain("stockpileCollectionsFooterButtonActive");
    expect(collapseButton.className).not.toContain("stockpileCollectionsFooterButtonActive");

    // Expand everything.
    expect(folderA).toHaveAttribute("aria-expanded", "true");
    expect(folderB).toHaveAttribute("aria-expanded", "true");
    expect(folderC).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(folderB);

    // Mixed state: neither button active.
    expect(folderA).toHaveAttribute("aria-expanded", "true");
    expect(folderB).toHaveAttribute("aria-expanded", "false");
    expect(collapseButton.className).not.toContain("stockpileCollectionsFooterButtonActive");
    expect(expandButton.className).not.toContain("stockpileCollectionsFooterButtonActive");

    expect(collapseButton.className).toContain("stockpileCollectionsFooterButton");
    expect(expandButton.className).toContain("stockpileCollectionsFooterButton");
  });
});
