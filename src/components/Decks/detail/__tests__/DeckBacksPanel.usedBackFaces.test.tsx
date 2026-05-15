import { fireEvent, render, screen } from "@testing-library/react";

import DeckBacksPanel from "@/components/Decks/detail/DeckBacksPanel";

const mockUseDeckRightPanel = jest.fn();
const mockUseStockpileFilters = jest.fn();

jest.mock("@/components/Decks/detail/context/DeckRightPanelContext", () => ({
  useDeckRightPanel: () => mockUseDeckRightPanel(),
}));
jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => {
      if (key === "placeholders.searchCards") return "Search cards...";
      if (key === "tooltip.searchCards") return "Search saved cards by name";
      if (key === "actions.clear") return "Clear";
      return key;
    },
  }),
}));

jest.mock("@/components/Stockpile/hooks/useStockpileFilters", () => ({
  useStockpileFilters: (...args: unknown[]) => mockUseStockpileFilters(...args),
}));

jest.mock("@/components/Stockpile/StockpileSidebar", () => () => <div data-testid="sidebar" />);
jest.mock(
  "@/components/Decks/detail/DeckFaceCardsFilterSelect",
  () =>
    ({
      onFilterChange,
    }: {
      onFilterChange: (next: { type: "all" } | { type: "collection"; id: string }) => void;
    }) =>
      (
        <button
          type="button"
          data-testid="deck-face-cards-filter-select"
          onClick={() => onFilterChange({ type: "collection", id: "collection-1" })}
        >
          select filter
        </button>
      ),
);

jest.mock("@dnd-kit/core", () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    isDragging: false,
  }),
}));

jest.mock("@/lib/card-thumbnail-cache", () => ({
  useCardThumbnailUrl: () => "blob:test-thumb",
}));

jest.mock("@/components/common/CardThumbnail", () => (props: { alt: string }) => (
  <div aria-label={props.alt || "thumb"} data-testid="card-thumb" />
));

describe("DeckBacksPanel used back-face availability", () => {
  const cards = [
    { id: "back-a", name: "Back A" },
    { id: "back-b", name: "Back B" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDeckRightPanel.mockReturnValue({
      isRightPanelVisible: true,
      setIsRightPanelVisible: jest.fn(),
      toggleRightPanel: jest.fn(),
      backCollections: [],
      backCards: cards,
      rightPanelEmptyLabel: "No backs",
      backFilter: { type: "all" },
      setBackFilter: jest.fn(),
      rightPanelFaceMode: "back",
      setRightPanelFaceMode: jest.fn(),
    });
    mockUseStockpileFilters.mockImplementation(({ cards: inputCards }) => ({
      filteredCards: inputCards,
      collectionCounts: new Map(),
      unfiledCount: inputCards.length,
      visibleCollectionIds: new Set(),
      overallCount: inputCards.length,
      recentCards: [],
      recentlyDeletedCount: 0,
      recentlyDeletedTotalCount: 0,
    }));
  });

  it("filters already-used back faces out of the addable grid", () => {
    render(
      <DeckBacksPanel
        usedBackFaceIds={new Set(["back-a"])}
        usedFrontFaceIds={new Set()}
        finalizingBackFaceId={null}
        finalizingFrontFaceId={null}
      />,
    );

    const callArg = mockUseStockpileFilters.mock.calls[0][0];
    expect(callArg.cards.map((card: { id: string }) => card.id)).toEqual(["back-b"]);
    expect(screen.getAllByTestId("card-thumb")).toHaveLength(1);
  });

  it("restores availability when a back face is no longer used", () => {
    const { rerender } = render(
      <DeckBacksPanel
        usedBackFaceIds={new Set(["back-a"])}
        usedFrontFaceIds={new Set()}
        finalizingBackFaceId={null}
        finalizingFrontFaceId={null}
      />,
    );
    let callArg = mockUseStockpileFilters.mock.calls[0][0];
    expect(callArg.cards.map((card: { id: string }) => card.id)).toEqual(["back-b"]);

    rerender(
      <DeckBacksPanel
        usedBackFaceIds={new Set()}
        usedFrontFaceIds={new Set()}
        finalizingBackFaceId={null}
        finalizingFrontFaceId={null}
      />,
    );
    callArg = mockUseStockpileFilters.mock.calls[1][0];
    expect(callArg.cards.map((card: { id: string }) => card.id)).toEqual(["back-a", "back-b"]);
    expect(screen.getAllByTestId("card-thumb")).toHaveLength(2);
  });

  it("filters already-used front faces out of the addable grid in front mode", () => {
    mockUseDeckRightPanel.mockReturnValue({
      isRightPanelVisible: true,
      setIsRightPanelVisible: jest.fn(),
      toggleRightPanel: jest.fn(),
      backCollections: [],
      backCards: cards,
      rightPanelEmptyLabel: "No fronts",
      backFilter: { type: "all" },
      setBackFilter: jest.fn(),
      rightPanelFaceMode: "front",
      setRightPanelFaceMode: jest.fn(),
    });

    render(
      <DeckBacksPanel
        usedBackFaceIds={new Set()}
        usedFrontFaceIds={new Set(["back-b"])}
        finalizingBackFaceId={null}
        finalizingFrontFaceId={null}
      />,
    );

    const callArg = mockUseStockpileFilters.mock.calls[0][0];
    expect(callArg.cards.map((card: { id: string }) => card.id)).toEqual(["back-a"]);
    expect(screen.getAllByTestId("card-thumb")).toHaveLength(1);
  });

  it("passes filter changes through to right panel filter setter", async () => {
    const setBackFilter = jest.fn();
    mockUseDeckRightPanel.mockReturnValue({
      isRightPanelVisible: true,
      setIsRightPanelVisible: jest.fn(),
      toggleRightPanel: jest.fn(),
      backCollections: [],
      backCards: cards,
      rightPanelEmptyLabel: "No backs",
      backFilter: { type: "all" },
      setBackFilter,
      rightPanelFaceMode: "back",
      setRightPanelFaceMode: jest.fn(),
    });

    render(
      <DeckBacksPanel
        usedBackFaceIds={new Set()}
        usedFrontFaceIds={new Set()}
        finalizingBackFaceId={null}
        finalizingFrontFaceId={null}
      />,
    );
    fireEvent.click(screen.getByTestId("deck-face-cards-filter-select"));
    expect(setBackFilter).toHaveBeenCalledWith({ type: "collection", id: "collection-1" });
  });

  it("passes search text through to stockpile filters", () => {
    render(
      <DeckBacksPanel
        usedBackFaceIds={new Set()}
        usedFrontFaceIds={new Set()}
        finalizingBackFaceId={null}
        finalizingFrontFaceId={null}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Search cards...");
    fireEvent.change(searchInput, { target: { value: "dragon" } });

    const firstCallArg = mockUseStockpileFilters.mock.calls[0][0];
    const secondCallArg = mockUseStockpileFilters.mock.calls[1][0];
    expect(firstCallArg.search).toBe("");
    expect(secondCallArg.search).toBe("dragon");
  });

  it("shows clear button for non-empty search and clears search", () => {
    render(
      <DeckBacksPanel
        usedBackFaceIds={new Set()}
        usedFrontFaceIds={new Set()}
        finalizingBackFaceId={null}
        finalizingFrontFaceId={null}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Search cards...");
    fireEvent.change(searchInput, { target: { value: "goblin" } });

    const clearButton = screen.getByRole("button", { name: "Clear" });
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);
    expect((screen.getByPlaceholderText("Search cards...") as HTMLInputElement).value).toBe("");

    const lastCallArg = mockUseStockpileFilters.mock.calls[mockUseStockpileFilters.mock.calls.length - 1][0];
    expect(lastCallArg.search).toBe("");
  });

  it("renders icon-only face tabs with accessible labels", () => {
    render(
      <DeckBacksPanel
        usedBackFaceIds={new Set()}
        usedFrontFaceIds={new Set()}
        finalizingBackFaceId={null}
        finalizingFrontFaceId={null}
      />,
    );

    expect(screen.getByRole("tab", { name: "Back faces" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Front faces" })).toBeInTheDocument();
  });

  it("switches face mode when icon tabs are clicked", () => {
    const setRightPanelFaceMode = jest.fn();
    const setIsRightPanelVisible = jest.fn();
    mockUseDeckRightPanel.mockReturnValue({
      isRightPanelVisible: true,
      setIsRightPanelVisible,
      toggleRightPanel: jest.fn(),
      backCollections: [],
      backCards: cards,
      rightPanelEmptyLabel: "No backs",
      backFilter: { type: "all" },
      setBackFilter: jest.fn(),
      rightPanelFaceMode: "back",
      setRightPanelFaceMode,
    });

    render(
      <DeckBacksPanel
        usedBackFaceIds={new Set()}
        usedFrontFaceIds={new Set()}
        finalizingBackFaceId={null}
        finalizingFrontFaceId={null}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Front faces" }));
    expect(setRightPanelFaceMode).toHaveBeenCalledWith("front");
    expect(setIsRightPanelVisible).not.toHaveBeenCalled();
  });

  it("auto-expands the view pane when switching tabs while collapsed", () => {
    const setRightPanelFaceMode = jest.fn();
    const setIsRightPanelVisible = jest.fn();
    mockUseDeckRightPanel.mockReturnValue({
      isRightPanelVisible: false,
      setIsRightPanelVisible,
      toggleRightPanel: jest.fn(),
      backCollections: [],
      backCards: cards,
      rightPanelEmptyLabel: "No backs",
      backFilter: { type: "all" },
      setBackFilter: jest.fn(),
      rightPanelFaceMode: "back",
      setRightPanelFaceMode,
    });

    render(
      <DeckBacksPanel
        usedBackFaceIds={new Set()}
        usedFrontFaceIds={new Set()}
        finalizingBackFaceId={null}
        finalizingFrontFaceId={null}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Front faces" }));
    expect(setRightPanelFaceMode).toHaveBeenCalledWith("front");
    expect(setIsRightPanelVisible).toHaveBeenCalledWith(true);
  });

  it("keeps tabs visible and toggles view pane with floating control", () => {
    const toggleRightPanel = jest.fn();
    mockUseDeckRightPanel.mockReturnValue({
      isRightPanelVisible: false,
      setIsRightPanelVisible: jest.fn(),
      toggleRightPanel,
      backCollections: [],
      backCards: cards,
      rightPanelEmptyLabel: "No backs",
      backFilter: { type: "all" },
      setBackFilter: jest.fn(),
      rightPanelFaceMode: "back",
      setRightPanelFaceMode: jest.fn(),
    });

    render(
      <DeckBacksPanel
        usedBackFaceIds={new Set()}
        usedFrontFaceIds={new Set()}
        finalizingBackFaceId={null}
        finalizingFrontFaceId={null}
      />,
    );

    expect(screen.getByRole("tab", { name: "Back faces" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "decks.sourcePanelToggle" }));
    expect(toggleRightPanel).toHaveBeenCalledTimes(1);
  });
});
