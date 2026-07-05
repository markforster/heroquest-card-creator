import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import StockpilePanelContent from "@/components/Stockpile/StockpilePanelContent";
import { LocalStorageProvider } from "@/components/Providers/LocalStorageProvider";

import type { CardRecord } from "@/api/cards";
import type { CollectionRecord } from "@/api/collections";

const mockTrack = jest.fn();
const mockSetActiveCard = jest.fn();
const mockResetWithSaved = jest.fn();
const mockSetCards = jest.fn();
const mockSetCollections = jest.fn();
const mockStartBulkCardExport = jest.fn();
const mockUseStockpileData = jest.fn();
const mockUseStockpileFilters = jest.fn();
const mockGetCard = jest.fn();
const mockListPairs = jest.fn();

jest.mock("@/api/client", () => ({
  __esModule: true,
  apiClient: {
    getCard: (...args: unknown[]) => mockGetCard(...args),
    listPairs: (...args: unknown[]) => mockListPairs(...args),
  },
}));

jest.mock("@/components/common/EscapeStackProvider", () => ({
  __esModule: true,
  useEscapeModalAware: jest.fn(),
}));

jest.mock("@/components/common/ModalShell", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/Export/hooks/useBulkCardExport", () => ({
  __esModule: true,
  useBulkCardExport: () => ({
    isExporting: false,
    exportUi: null,
    startBulkCardExport: mockStartBulkCardExport,
  }),
}));

jest.mock("@/components/Modals/ConfirmModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Providers/AnalyticsProvider", () => ({
  __esModule: true,
  useAnalytics: () => ({
    track: mockTrack,
  }),
}));

jest.mock("@/components/Providers/CardEditorContext", () => ({
  __esModule: true,
  useCardEditor: () => ({
    state: {
      activeCardIdByTemplate: {},
      selectedTemplateId: "hero",
    },
    setActiveCard: mockSetActiveCard,
  }),
}));

jest.mock("@/components/Providers/EditorFormContext", () => ({
  __esModule: true,
  useEditorForm: () => ({
    resetWithSaved: mockResetWithSaved,
  }),
}));

jest.mock("@/components/Providers/MissingAssetsContext", () => ({
  __esModule: true,
  useMissingAssets: () => ({
    missingArtworkIds: new Set<string>(),
  }),
}));

jest.mock("@/components/Stockpile/hooks/useStockpileData", () => ({
  __esModule: true,
  useStockpileData: (...args: unknown[]) => mockUseStockpileData(...args),
}));

jest.mock("@/components/Stockpile/hooks/useStockpileFilters", () => ({
  __esModule: true,
  useStockpileFilters: (...args: unknown[]) => mockUseStockpileFilters(...args),
}));

jest.mock("@/components/Stockpile/StockpileActionsBar", () => ({
  __esModule: true,
  default: () => <div data-testid="stockpile-actions-bar" />,
}));

jest.mock("@/components/Stockpile/StockpileAddToCollectionController", () => ({
  __esModule: true,
  default: () => <div data-testid="stockpile-add-to-collection" />,
}));

jest.mock("@/components/Stockpile/StockpileCollectionModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Stockpile/pdf/CollectionPdfExportSummaryModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Stockpile/StockpileConfirmModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Stockpile/StockpileContentPane", () => ({
  __esModule: true,
  default: () => <div data-testid="stockpile-content-pane" />,
}));

jest.mock("@/components/Stockpile/StockpileExportPairPrompt", () => ({
  __esModule: true,
  default: ({
    exportPairPrompt,
    cardById,
    onExportCards,
  }: {
    exportPairPrompt: { baseIds: string[]; pairedIds: string[] } | null;
    cardById: Map<string, CardRecord>;
    onExportCards: (cards: CardRecord[]) => void;
  }) => {
    if (!exportPairPrompt) return null;
    return (
      <button
        type="button"
        onClick={() => {
          const cards = [...exportPairPrompt.baseIds, ...exportPairPrompt.pairedIds]
            .map((id) => cardById.get(id))
            .filter((card): card is CardRecord => Boolean(card));
          onExportCards(cards);
        }}
      >
        Confirm paired export
      </button>
    );
  },
}));

jest.mock("@/components/Stockpile/StockpileFooter", () => ({
  __esModule: true,
  default: ({
    onBulkExport,
    canExport,
    exportLabel,
  }: {
    onBulkExport: () => void;
    canExport: boolean;
    exportLabel: string;
  }) => (
    <button type="button" disabled={!canExport} onClick={() => void onBulkExport()}>
      {exportLabel}
    </button>
  ),
}));

jest.mock("@/components/Stockpile/StockpileMissingAssetsModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Stockpile/StockpilePairPopover", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Stockpile/StockpileSidebar", () => ({
  __esModule: true,
  default: ({
    onFilterChange,
  }: {
    onFilterChange: (next: { type: "collection"; id: string }) => void;
  }) => (
    <button type="button" onClick={() => onFilterChange({ type: "collection", id: "collection-1" })}>
      Open collection
    </button>
  ),
}));

jest.mock("@/components/Stockpile/StockpileTableThumbPopover", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Stockpile/StockpileToolbar", () => ({
  __esModule: true,
  default: () => <div data-testid="stockpile-toolbar" />,
}));

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    language: "en",
    t: (key: string) => {
      const map: Record<string, string> = {
        "actions.export": "Export",
        "actions.exportAll": "Export all",
        "actions.exporting": "Exporting",
        "actions.fromThisCollection": "from this collection",
        "actions.allCards": "All cards",
        "label.collections": "Collections",
        "ui.allTypes": "All types",
        "label.card": "Card",
        "label.cardName": "Card name",
        "label.cardType": "Card type",
        "label.cardFace": "Card face",
        "label.lastModified": "Last modified",
        "label.pairing": "Pairing",
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: () => ({ search: "" }),
  useNavigate: () => jest.fn(),
}));

function createSummaryCard(overrides: Partial<CardRecord>): CardRecord {
  return {
    id: "card-1",
    templateId: "hero",
    status: "saved",
    name: "Summary Card",
    nameLower: "summary card",
    createdAt: 1,
    updatedAt: 2,
    schemaVersion: 2,
    face: "front",
    ...overrides,
  };
}

function createCollectionRecord(overrides: Partial<CollectionRecord>): CollectionRecord {
  return {
    id: "collection-1",
    name: "Collection One",
    cardIds: [],
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

function renderPanel() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <LocalStorageProvider>
        <StockpilePanelContent isOpen onClose={() => {}} frame="panel" />
      </LocalStorageProvider>
    </QueryClientProvider>,
  );
}

describe("StockpilePanelContent export hydration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();

    mockListPairs.mockResolvedValue([]);
    mockStartBulkCardExport.mockResolvedValue({ status: "completed", result: { status: "success" } });

    mockUseStockpileData.mockImplementation(
      ({
        activeFilter,
      }: {
        activeFilter: { type: "all" } | { type: "collection"; id: string };
      }) => {
        const front = createSummaryCard({
          id: "front-1",
          name: "Front Summary",
          nameLower: "front summary",
          face: "front",
        });
        const back = createSummaryCard({
          id: "back-1",
          templateId: "labelled-back",
          name: "Back Summary",
          nameLower: "back summary",
          face: "back",
        });
        const cards = [front, back];
        const collections = [
          createCollectionRecord({
            cardIds:
              activeFilter.type === "collection" && activeFilter.id === "collection-1"
                ? ["front-1"]
                : [],
          }),
        ];

        return {
          cards,
          setCards: mockSetCards,
          isLoadingCards: false,
          collections,
          setCollections: mockSetCollections,
        };
      },
    );

    mockUseStockpileFilters.mockImplementation(
      ({
        cards,
        collections,
        activeFilter,
      }: {
        cards: CardRecord[];
        collections: CollectionRecord[];
        activeFilter: { type: "all" } | { type: "collection"; id: string };
      }) => {
        const activeCollection =
          activeFilter.type === "collection"
            ? collections.find((collection) => collection.id === activeFilter.id) ?? null
            : null;
        const filteredCards = activeCollection
          ? cards.filter((card) => activeCollection.cardIds.includes(card.id))
          : cards;

        return {
          recentlyDeletedCount: 0,
          recentlyDeletedTotalCount: 0,
          recentCards: [],
          filteredCards,
          collectionCounts: new Map([["collection-1", 1]]),
          unfiledCount: 0,
          typeCounts: new Map(),
          totalCount: filteredCards.length,
          faceCounts: { front: filteredCards.filter((card) => card.face !== "back").length, back: filteredCards.filter((card) => card.face === "back").length },
          visibleCollectionIds: new Set(["collection-1"]),
          eligibleIdSet: new Set(cards.map((card) => card.id)),
          overallCount: cards.length,
        };
      },
    );
  });

  it("hydrates full records before starting collection export", async () => {
    const hydratedFront = createSummaryCard({
      id: "front-1",
      title: "Hydrated Front",
      description: "Hydrated body",
      imageAssetId: "asset-1",
      heroAttackDice: [3, 0, 0],
      heroDefendDice: [2, 0, 0],
      heroBodyPoints: [5, 0, 0],
      heroMindPoints: [4, 0, 0],
    });
    mockGetCard.mockImplementation(async ({ params }: { params: { id: string } }) => {
      if (params.id === "front-1") {
        return hydratedFront;
      }
      if (params.id === "back-1") {
        return createSummaryCard({ id: "back-1", templateId: "labelled-back", face: "back" });
      }
      return null;
    });

    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Open collection" }));
    fireEvent.click(await screen.findByRole("button", { name: "Export all from this collection" }));

    await waitFor(() => {
      expect(mockStartBulkCardExport).toHaveBeenCalledTimes(1);
    });

    const firstCall = mockStartBulkCardExport.mock.calls[0][0];
    expect(firstCall.cards).toEqual([hydratedFront]);
    expect(firstCall.cards[0]).toEqual(expect.objectContaining({
      id: "front-1",
      title: "Hydrated Front",
      description: "Hydrated body",
      imageAssetId: "asset-1",
      heroAttackDice: [3, 0, 0],
    }));
  });

  it("hydrates both selected collection cards and paired cards before paired export", async () => {
    mockListPairs.mockResolvedValue([{ frontFaceId: "front-1", backFaceId: "back-1" }]);

    const hydratedFront = createSummaryCard({
      id: "front-1",
      title: "Hydrated Front",
      description: "Hydrated body",
      imageAssetId: "asset-1",
      heroAttackDice: [3, 0, 0],
    });
    const hydratedBack = createSummaryCard({
      id: "back-1",
      templateId: "labelled-back",
      name: "Hydrated Back",
      nameLower: "hydrated back",
      title: "Hydrated Back",
      description: "Back details",
      imageAssetId: "asset-2",
      face: "back",
    });
    mockGetCard.mockImplementation(async ({ params }: { params: { id: string } }) => {
      if (params.id === "front-1") return hydratedFront;
      if (params.id === "back-1") return hydratedBack;
      return null;
    });

    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Open collection" }));
    fireEvent.click(await screen.findByRole("button", { name: "Export all from this collection" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm paired export" }));

    await waitFor(() => {
      expect(mockStartBulkCardExport).toHaveBeenCalledTimes(1);
    });

    const firstCall = mockStartBulkCardExport.mock.calls[0][0];
    expect(firstCall.cards).toEqual([hydratedFront, hydratedBack]);
  });
});
