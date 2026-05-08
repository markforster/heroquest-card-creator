import { render, screen } from "@testing-library/react";

import DeckBacksPanel from "@/components/Decks/detail/DeckBacksPanel";

const mockUseDeckRightPanel = jest.fn();
const mockUseStockpileFilters = jest.fn();

jest.mock("@/components/Decks/detail/context/DeckRightPanelContext", () => ({
  useDeckRightPanel: () => mockUseDeckRightPanel(),
}));

jest.mock("@/components/Stockpile/hooks/useStockpileFilters", () => ({
  useStockpileFilters: (...args: unknown[]) => mockUseStockpileFilters(...args),
}));

jest.mock("@/components/Stockpile/StockpileSidebar", () => () => <div data-testid="sidebar" />);

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
    render(<DeckBacksPanel usedBackFaceIds={new Set(["back-a"])} usedFrontFaceIds={new Set()} />);

    const callArg = mockUseStockpileFilters.mock.calls[0][0];
    expect(callArg.cards.map((card: { id: string }) => card.id)).toEqual(["back-b"]);
    expect(screen.getAllByTestId("card-thumb")).toHaveLength(1);
  });

  it("restores availability when a back face is no longer used", () => {
    const { rerender } = render(
      <DeckBacksPanel usedBackFaceIds={new Set(["back-a"])} usedFrontFaceIds={new Set()} />,
    );
    let callArg = mockUseStockpileFilters.mock.calls[0][0];
    expect(callArg.cards.map((card: { id: string }) => card.id)).toEqual(["back-b"]);

    rerender(<DeckBacksPanel usedBackFaceIds={new Set()} usedFrontFaceIds={new Set()} />);
    callArg = mockUseStockpileFilters.mock.calls[1][0];
    expect(callArg.cards.map((card: { id: string }) => card.id)).toEqual(["back-a", "back-b"]);
    expect(screen.getAllByTestId("card-thumb")).toHaveLength(2);
  });

  it("filters already-used front faces out of the addable grid in front mode", () => {
    mockUseDeckRightPanel.mockReturnValue({
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
      />,
    );

    const callArg = mockUseStockpileFilters.mock.calls[0][0];
    expect(callArg.cards.map((card: { id: string }) => card.id)).toEqual(["back-a"]);
    expect(screen.getAllByTestId("card-thumb")).toHaveLength(1);
  });
});
