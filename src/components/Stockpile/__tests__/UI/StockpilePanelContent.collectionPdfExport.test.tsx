import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import StockpilePanelContent from "@/components/Stockpile/StockpilePanelContent";
import { LocalStorageProvider } from "@/components/Providers/LocalStorageProvider";

const mockUseStockpileData = jest.fn();
const mockUseStockpileFilters = jest.fn();
const mockListPairs = jest.fn();

jest.mock("@/config/flags", () => ({
  ENABLE_CARD_THUMB_CACHE: true,
  ENABLE_STOCKPILE_COLLECTION_PDF_EXPORT: false,
}));

jest.mock("@/api/client", () => ({
  __esModule: true,
  apiClient: {
    listPairs: (...args: unknown[]) => mockListPairs(...args),
  },
}));

jest.mock("@/components/common/EscapeStackProvider", () => ({
  __esModule: true,
  useEscapeModalAware: jest.fn(),
}));

jest.mock("@/components/common/ModalShell", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/Export/hooks/useBulkCardExport", () => ({
  __esModule: true,
  useBulkCardExport: () => ({
    isExporting: false,
    exportUi: null,
    startBulkCardExport: jest.fn(),
  }),
}));

jest.mock("@/components/Modals/ConfirmModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Providers/AnalyticsProvider", () => ({
  __esModule: true,
  useAnalytics: () => ({
    track: jest.fn(),
  }),
}));

jest.mock("@/components/Providers/CardEditorContext", () => ({
  __esModule: true,
  useCardEditor: () => ({
    state: {
      activeCardIdByTemplate: {},
      selectedTemplateId: "hero",
    },
    setActiveCard: jest.fn(),
  }),
}));

jest.mock("@/components/Providers/EditorFormContext", () => ({
  __esModule: true,
  useEditorForm: () => ({
    resetWithSaved: jest.fn(),
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

jest.mock("@/components/Stockpile/pdf/CollectionPdfExportSummaryModal", () => ({
  __esModule: true,
  default: () => null,
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
  default: () => null,
}));

jest.mock("@/components/Stockpile/StockpileFooter", () => ({
  __esModule: true,
  default: ({
    onBulkExport,
    canExport,
    exportLabel,
    onPdfExport,
    canPdfExport,
    pdfExportLabel,
  }: {
    onBulkExport: () => void;
    canExport: boolean;
    exportLabel: string;
    onPdfExport?: () => void;
    canPdfExport?: boolean;
    pdfExportLabel?: string;
  }) => (
    <div>
      <button type="button" disabled={!canExport} onClick={() => void onBulkExport()}>
        {exportLabel}
      </button>
      {onPdfExport && pdfExportLabel ? (
        <button type="button" disabled={!canPdfExport} onClick={() => void onPdfExport()}>
          {pdfExportLabel}
        </button>
      ) : null}
    </div>
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
    <button type="button" data-testid="stockpile-sidebar" onClick={() => onFilterChange({ type: "collection", id: "collection-1" })}>
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
        "label.cards": "Cards",
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

describe("StockpilePanelContent collection pdf export", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListPairs.mockReturnValue(new Promise(() => {}));

    mockUseStockpileData.mockReturnValue({
      cards: [],
      setCards: jest.fn(),
      isLoadingCards: false,
      collections: [],
      setCollections: jest.fn(),
    });

    mockUseStockpileFilters.mockReturnValue({
      recentlyDeletedCount: 0,
      recentlyDeletedTotalCount: 0,
      recentCards: [],
      filteredCards: [],
      collectionCounts: new Map(),
      unfiledCount: 0,
      typeCounts: new Map(),
      totalCount: 0,
      faceCounts: { front: 0, back: 0 },
      visibleCollectionIds: new Set(),
      eligibleIdSet: new Set(),
      overallCount: 0,
    });
  });

  it("does not render the pdf button while the feature flag is disabled", () => {
    renderPanel();

    expect(screen.queryByRole("button", { name: /Export PDF/i })).not.toBeInTheDocument();
  });
});
