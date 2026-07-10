import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

import StockpilePanelContent from "@/components/Stockpile/StockpilePanelContent";
import { LocalStorageProvider } from "@/components/Providers/LocalStorageProvider";
import { I18nProvider } from "@/i18n/I18nProvider";

const mockTrack = jest.fn();
const mockSetActiveCard = jest.fn();
const mockResetWithSaved = jest.fn();
const mockSetCards = jest.fn();
const mockSetCollections = jest.fn();
const mockUseStockpileData = jest.fn();
const mockUseStockpileFilters = jest.fn();
const mockSetTip = jest.fn();
const mockClearTip = jest.fn();
let lastPrimaryToolbarProps: Record<string, unknown> | null = null;
let lastBottomToolbarProps: Record<string, unknown> | null = null;
let lastStockpileToolbarProps: Record<string, unknown> | null = null;
let lastStockpileActionsBarProps: Record<string, unknown> | null = null;
let lastStockpileFooterProps: Record<string, unknown> | null = null;

jest.mock("@/api/client", () => ({
  __esModule: true,
  apiClient: {
    listPairs: jest.fn(() => new Promise(() => {})),
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

jest.mock("@/components/Providers/FooterTipContext", () => ({
  __esModule: true,
  useFooterTip: () => ({
    currentTip: null,
    setTip: mockSetTip,
    clearTip: mockClearTip,
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
  default: (props: Record<string, unknown>) => {
    lastStockpileActionsBarProps = props;
    return <div data-testid="stockpile-actions-bar" />;
  },
}));

jest.mock("@/components/Stockpile/StockpileAddToCollectionModal", () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="stockpile-add-to-collection-modal" /> : null,
}));

jest.mock("@/components/Stockpile/StockpileBottomToolbar", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    lastBottomToolbarProps = props;
    return (
      <div data-testid="stockpile-bottom-toolbar">
        <button type="button" onClick={() => (props.onSelectNone as () => void)()}>
          Bottom select none
        </button>
        <button type="button" onClick={() => (props.onSelectAllToggle as () => void)()}>
          Bottom select all
        </button>
        <button type="button" onClick={() => (props.onAddToCollection as () => void)()}>
          Bottom add
        </button>
      </div>
    );
  },
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
  default: (props: Record<string, unknown>) => {
    lastStockpileFooterProps = props;
    return (
      <div data-testid="stockpile-footer">
        {props.collectionControls as ReactNode}
      </div>
    );
  },
}));

jest.mock("@/components/Stockpile/StockpileMissingAssetsModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Stockpile/StockpilePairPopover", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Stockpile/pdf/CollectionPdfExportSummaryModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Stockpile/StockpilePrimaryToolbar", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    lastPrimaryToolbarProps = props;
    return (
      <div data-testid="stockpile-primary-toolbar">
        <button type="button" onClick={() => (props.onSearchChange as (value: string) => void)("ritual")}>
          Primary search change
        </button>
        <button type="button" onClick={() => (props.onFilterChange as (value: string) => void)("face:back")}>
          Primary filter change
        </button>
        <button type="button" onClick={() => (props.onFilterChange as (value: string) => void)("all")}>
          Primary filter all cards
        </button>
        <button
          type="button"
          onClick={() => (props.onViewModeChange as (value: "grid" | "table") => void)("table")}
        >
          Primary view change
        </button>
        <button
          type="button"
          onClick={() =>
            (props.onShowUnpairedOnlyChange as ((value: boolean) => void) | undefined)?.(true)
          }
        >
          Primary not paired
        </button>
        <button
          type="button"
          onClick={() => (props.onGroupChange as (value: "none" | "type") => void)("type")}
        >
          Primary group change
        </button>
      </div>
    );
  },
}));

jest.mock("@/components/Stockpile/StockpileSidebar", () => ({
  __esModule: true,
  default: () => <aside aria-label="Collections" data-testid="stockpile-sidebar" />,
}));

jest.mock("@/components/Stockpile/StockpileTableThumbPopover", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Stockpile/StockpileToolbar", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    lastStockpileToolbarProps = props;
    return (
      <div data-testid="stockpile-toolbar">
        <div data-testid="stockpile-toolbar-search">{String(props.search ?? "")}</div>
        <div data-testid="stockpile-toolbar-filter">{String(props.templateFilter ?? "")}</div>
      </div>
    );
  },
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: () => ({ search: "" }),
  useNavigate: () => jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
  }),
}));

function renderPanel(props?: Partial<ComponentProps<typeof StockpilePanelContent>>) {
  return render(
    <LocalStorageProvider>
      <I18nProvider>
        <StockpilePanelContent isOpen onClose={() => {}} frame="panel" {...props} />
      </I18nProvider>
    </LocalStorageProvider>,
  );
}

describe("StockpilePanelContent primary toolbar placement (UI)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    lastPrimaryToolbarProps = null;
    lastBottomToolbarProps = null;
    lastStockpileToolbarProps = null;
    lastStockpileActionsBarProps = null;
    lastStockpileFooterProps = null;

    mockUseStockpileData.mockReturnValue({
      cards: [],
      setCards: mockSetCards,
      isLoadingCards: false,
      collections: [],
      setCollections: mockSetCollections,
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
      groupedCards: [],
    });
  });

  it("renders the new primary toolbar above the existing stockpile toolbar and the bottom toolbar in the footer", () => {
    renderPanel();

    const primaryToolbar = screen.getByTestId("stockpile-primary-toolbar");
    const existingToolbar = screen.getByTestId("stockpile-toolbar");
    const contentPane = screen.getByTestId("stockpile-content-pane");
    const footer = screen.getByTestId("stockpile-footer");
    const bottomToolbar = screen.getByTestId("stockpile-bottom-toolbar");

    expect(primaryToolbar.compareDocumentPosition(existingToolbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(existingToolbar.compareDocumentPosition(contentPane) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(contentPane.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId("stockpile-status-strip")).not.toBeInTheDocument();
    expect(bottomToolbar).toBeInTheDocument();
  });

  it("shares search, filter, view, and not-paired state with the existing stockpile surfaces", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Primary search change" }));
    expect(screen.getByTestId("stockpile-toolbar-search")).toHaveTextContent("ritual");

    fireEvent.click(screen.getByRole("button", { name: "Primary filter change" }));
    expect(screen.getByTestId("stockpile-toolbar-filter")).toHaveTextContent("back");

    fireEvent.click(screen.getByRole("button", { name: "Primary view change" }));
    expect(window.localStorage.getItem("hqcc.stockpileView")).toBe("table");
    expect(lastPrimaryToolbarProps?.viewMode).toBe("table");

    fireEvent.click(screen.getByRole("button", { name: "Primary not paired" }));
    expect(lastPrimaryToolbarProps?.showUnpairedOnly).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Primary group change" }));
    expect(lastPrimaryToolbarProps?.groupValue).toBe("type");
    expect(mockSetTip).toHaveBeenLastCalledWith(
      "stockpile",
      "Select a card by clicking on it.",
      "lightbulb",
    );
  });

  it("uses a single all-cards toolbar option for the unfiltered state", () => {
    renderPanel();

    expect(lastPrimaryToolbarProps?.filterValue).toBe("all");

    fireEvent.click(screen.getByRole("button", { name: "Primary filter all cards" }));
    expect(lastPrimaryToolbarProps?.filterValue).toBe("all");
  });

  it("moves standard actions into the bottom toolbar and keeps the top toolbar focused on view controls", () => {
    mockUseStockpileData.mockReturnValue({
      cards: [
        {
          id: "card-1",
          name: "Card 1",
          title: "Card 1",
          nameLower: "card 1",
          templateId: "hero",
          face: "front",
          updatedAt: Date.now(),
          deletedAt: null,
          thumbnailBlob: null,
        },
      ],
      setCards: mockSetCards,
      isLoadingCards: false,
      collections: [{ id: "collection-1", name: "Collection 1", cardIds: [] }],
      setCollections: mockSetCollections,
    });

    mockUseStockpileFilters.mockReturnValue({
      recentlyDeletedCount: 0,
      recentlyDeletedTotalCount: 0,
      recentCards: [],
      filteredCards: [
        {
          id: "card-1",
          name: "Card 1",
          title: "Card 1",
          nameLower: "card 1",
          templateId: "hero",
          face: "front",
          updatedAt: Date.now(),
          deletedAt: null,
          thumbnailBlob: null,
        },
      ],
      collectionCounts: new Map(),
      unfiledCount: 0,
      typeCounts: new Map(),
      totalCount: 1,
      faceCounts: { front: 1, back: 0 },
      visibleCollectionIds: new Set(),
      eligibleIdSet: new Set(["card-1"]),
      overallCount: 1,
      groupedCards: [],
    });

    renderPanel({ initialSelectedIds: ["card-1"], onLoadCard: () => {} });

    expect(lastPrimaryToolbarProps?.onAddToCollection).toBeUndefined();
    expect(lastPrimaryToolbarProps?.onDelete).toBeUndefined();
    expect(lastPrimaryToolbarProps?.onExport).toBeUndefined();
    expect(lastPrimaryToolbarProps?.onLoad).toBeUndefined();
    expect(lastBottomToolbarProps?.isAddToCollectionDisabled).toBe(false);
    expect(lastBottomToolbarProps?.isDeleteDisabled).toBe(false);
    expect(lastBottomToolbarProps?.isExportDisabled).toBe(false);
    expect(lastBottomToolbarProps?.isLoadDisabled).toBe(false);
    expect(lastStockpileToolbarProps?.showUnpairedToggle).toBe(false);
    expect(lastStockpileActionsBarProps).toBeNull();
  });

  it("opens the lifted add-to-collection modal from the bottom toolbar action", () => {
    mockUseStockpileData.mockReturnValue({
      cards: [
        {
          id: "card-1",
          name: "Card 1",
          title: "Card 1",
          nameLower: "card 1",
          templateId: "hero",
          face: "front",
          updatedAt: Date.now(),
          deletedAt: null,
          thumbnailBlob: null,
        },
      ],
      setCards: mockSetCards,
      isLoadingCards: false,
      collections: [{ id: "collection-1", name: "Collection 1", cardIds: [] }],
      setCollections: mockSetCollections,
    });

    mockUseStockpileFilters.mockReturnValue({
      recentlyDeletedCount: 0,
      recentlyDeletedTotalCount: 0,
      recentCards: [],
      filteredCards: [
        {
          id: "card-1",
          name: "Card 1",
          title: "Card 1",
          nameLower: "card 1",
          templateId: "hero",
          face: "front",
          updatedAt: Date.now(),
          deletedAt: null,
          thumbnailBlob: null,
        },
      ],
      collectionCounts: new Map(),
      unfiledCount: 0,
      typeCounts: new Map(),
      totalCount: 1,
      faceCounts: { front: 1, back: 0 },
      visibleCollectionIds: new Set(),
      eligibleIdSet: new Set(["card-1"]),
      overallCount: 1,
      groupedCards: [],
    });

    renderPanel({ initialSelectedIds: ["card-1"] });

    fireEvent.click(screen.getByRole("button", { name: "Bottom add" }));
    expect(screen.getByTestId("stockpile-add-to-collection-modal")).toBeInTheDocument();
  });

  it("publishes and clears footer tips for stockpile mode", () => {
    const { unmount } = renderPanel();

    expect(mockSetTip).toHaveBeenCalledWith(
      "stockpile",
      "Select a card by clicking on it.",
      "lightbulb",
    );

    unmount();
    expect(mockClearTip).toHaveBeenCalledWith("stockpile");
  });

  it("keeps pair mode footer behavior and does not render the normal bottom toolbar", () => {
    renderPanel({ mode: "pair-fronts" });

    expect(screen.queryByTestId("stockpile-primary-toolbar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("stockpile-bottom-toolbar")).not.toBeInTheDocument();
    expect(lastStockpileFooterProps?.isPairMode).toBe(true);
    expect(lastStockpileFooterProps?.showBulkExportAction).toBe(true);
    expect(lastStockpileFooterProps?.showLoadAction).toBe(true);
  });
});
