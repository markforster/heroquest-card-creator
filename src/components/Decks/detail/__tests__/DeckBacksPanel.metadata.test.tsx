import { render, screen, waitFor } from "@testing-library/react";
import { TransformStream } from "node:stream/web";

const mockUseDeckRightPanel = jest.fn();
const mockUseStockpileFilters = jest.fn();
const mockResolveDeckExportFaceIds = jest.fn();
const mockListPairsMap = jest.fn();
const mockCardFan = jest.fn();

if (!(globalThis as { TransformStream?: typeof TransformStream }).TransformStream) {
  (globalThis as { TransformStream?: typeof TransformStream }).TransformStream =
    TransformStream;
}

jest.mock("@/components/Decks/detail/context/DeckRightPanelContext", () => ({
  useDeckRightPanel: () => mockUseDeckRightPanel(),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    getDeck: jest.fn(),
    listDeckGroups: jest.fn(),
    listDeckSets: jest.fn(),
    listDeckEntries: jest.fn(),
  },
}));

jest.mock("@/components/Decks/deck-export", () => ({
  resolveDeckExportFaceIds: (...args: unknown[]) => mockResolveDeckExportFaceIds(...args),
}));

jest.mock("@/components/Decks/deck-preview", () => ({
  listPairsMap: (...args: unknown[]) => mockListPairsMap(...args),
  orderDeckPreviewCandidateIds: (ids: string[]) => ids,
}));

jest.mock("@/components/Decks/CardFan", () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockCardFan(props);
    return <div data-testid="deck-meta-card-fan" />;
  },
}));

jest.mock("@/components/Stockpile/hooks/useStockpileFilters", () => ({
  useStockpileFilters: (...args: unknown[]) => mockUseStockpileFilters(...args),
}));

const { apiClient: mockApiClient } = jest.requireMock("@/api/client") as {
  apiClient: {
    getDeck: jest.Mock;
    listDeckGroups: jest.Mock;
    listDeckSets: jest.Mock;
    listDeckEntries: jest.Mock;
  };
};

const DeckBacksPanel =
  require("@/components/Decks/detail/DeckBacksPanel").default as typeof import("@/components/Decks/detail/DeckBacksPanel").default;

describe("DeckBacksPanel metadata tab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDeckRightPanel.mockReturnValue({
      isRightPanelVisible: true,
      setIsRightPanelVisible: jest.fn(),
      toggleRightPanel: jest.fn(),
      backCollections: [],
      backCards: [],
      rightPanelEmptyLabel: "No cards",
      backFilter: { type: "all" },
      setBackFilter: jest.fn(),
      rightPanelFaceMode: "meta",
      setRightPanelFaceMode: jest.fn(),
      sourceSearch: "",
      setSourceSearch: jest.fn(),
    });
    mockUseStockpileFilters.mockReturnValue({
      filteredCards: [],
      collectionCounts: new Map(),
      unfiledCount: 0,
      visibleCollectionIds: new Set(),
      overallCount: 0,
      recentCards: [],
      recentlyDeletedCount: 0,
      recentlyDeletedTotalCount: 0,
    });
    mockApiClient.getDeck.mockResolvedValue({
      id: "deck-1",
      title: "Deck",
      description: null,
      keySetId: "set-2",
      createdAt: 10,
      updatedAt: 20,
      schemaVersion: 1,
    });
    mockApiClient.listDeckGroups.mockResolvedValue([
      { id: "group-1", sortIndex: 1 },
      { id: "group-2", sortIndex: 0 },
    ]);
    mockApiClient.listDeckSets.mockResolvedValue([
      { id: "set-1", groupId: "group-1", backFaceId: "back-1", sortIndex: 1 },
      { id: "set-2", groupId: "group-2", backFaceId: "back-2", sortIndex: 1 },
      { id: "set-3", groupId: "group-1", backFaceId: "back-3", sortIndex: 0 },
      { id: "set-4", groupId: "group-2", backFaceId: "back-2", sortIndex: 0 },
    ]);
    mockApiClient.listDeckEntries.mockImplementation(async ({ params }: { params: { setId: string } }) => {
      if (params.setId === "set-1") {
        return [
          { id: "entry-1", pairId: "pair-1", count: 2 },
          { id: "entry-2", pairId: "pair-2", count: 1 },
        ];
      }
      return [{ id: "entry-3", pairId: "pair-3", count: 3 }];
    });
    mockListPairsMap.mockResolvedValue(
      new Map([
        ["pair-1", { id: "pair-1", backFaceId: "back-1", frontFaceId: "front-1" }],
        ["pair-2", { id: "pair-2", backFaceId: "back-1", frontFaceId: "front-2" }],
        ["pair-3", { id: "pair-3", backFaceId: "back-2", frontFaceId: "front-3" }],
        ["pair-4", { id: "pair-4", backFaceId: "back-2", frontFaceId: "front-4" }],
      ]),
    );
    mockResolveDeckExportFaceIds.mockResolvedValue({
      faceIds: ["back-1", "back-2", "front-1", "front-2", "front-3"],
      setCount: 2,
      backCount: 2,
      frontCount: 3,
      totalCount: 5,
    });
  });

  it("renders computed metadata metrics", async () => {
    render(
      <DeckBacksPanel
        deckId="deck-1"
        usedBackFaceIds={new Set()}
        usedFrontFaceIds={new Set()}
        finalizingBackFaceId={null}
        finalizingFrontFaceId={null}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText("decks.meta.loading")).not.toBeInTheDocument();
    });

    const title = screen.getByText("decks.meta.title");
    expect(title).toBeInTheDocument();
    expect(title.closest(".deckFaceModeTitle")).not.toBeNull();
    expect(screen.getByTestId("deck-meta-fan")).toBeInTheDocument();
    expect(screen.getByTestId("deck-meta-card-fan")).toBeInTheDocument();
    expect(screen.getByText("decks.meta.images.totalUnique")).toBeInTheDocument();
    expect(screen.getByText("decks.meta.pdf.quantityTotal")).toBeInTheDocument();
    expect(screen.getByText("decks.meta.health.pairedMissing")).toBeInTheDocument();
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(mockResolveDeckExportFaceIds).toHaveBeenCalledWith("deck-1");
    expect(mockCardFan).toHaveBeenCalledWith(
      expect.objectContaining({
        cardIds: ["back-2", "back-3", "back-1"],
        variant: "lg",
      }),
    );
  });
});
