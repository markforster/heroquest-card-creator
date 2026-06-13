import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import styles from "@/app/page.module.css";
import StockpilePanelContent from "@/components/Stockpile/StockpilePanelContent";
import { LocalStorageProvider } from "@/components/Providers/LocalStorageProvider";
import { I18nProvider } from "@/i18n/I18nProvider";

const mockTrack = jest.fn();
const mockSetActiveCard = jest.fn();
const mockResetWithSaved = jest.fn();
const mockSetCards = jest.fn();
const mockSetCollections = jest.fn();
const mockStartBulkCardExport = jest.fn();
const mockUseStockpileData = jest.fn();
const mockUseStockpileFilters = jest.fn();

jest.mock("@/api/client", () => ({
  __esModule: true,
  apiClient: {
    listPairs: jest.fn().mockResolvedValue([]),
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
  default: () => <div data-testid="stockpile-footer" />,
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
  default: () => <aside aria-label="Collections" data-testid="stockpile-sidebar" />,
}));

jest.mock("@/components/Stockpile/StockpileTableThumbPopover", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Stockpile/StockpileToolbar", () => ({
  __esModule: true,
  default: () => <div data-testid="stockpile-toolbar" />,
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: () => ({ search: "" }),
  useNavigate: () => jest.fn(),
}));

function renderPanel() {
  return render(
    <LocalStorageProvider>
      <I18nProvider>
        <StockpilePanelContent isOpen onClose={() => {}} frame="panel" />
      </I18nProvider>
    </LocalStorageProvider>,
  );
}

describe("StockpilePanelContent filters panel collapse (UI)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();

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
    });
  });

  it("defaults the filters panel to open when no preference is stored", async () => {
    const { container } = renderPanel();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Collapse collections panel" }),
      ).toBeInTheDocument();
    });

    const rightPanel = container.querySelector(`.${styles.stockpileRightPanel}`);
    const content = container.querySelector(`.${styles.stockpileRightPanelContent}`);

    expect(rightPanel).toBeInTheDocument();
    expect(rightPanel?.className).not.toContain(styles.stockpileRightPanelCollapsed);
    expect(content?.className).not.toContain(styles.stockpileRightPanelContentCollapsed);
    expect(window.localStorage.getItem("hqcc.stockpile.filtersPanelOpen")).toBeNull();
  });

  it("renders collapsed from a stored false value while keeping the sidebar mounted", async () => {
    window.localStorage.setItem("hqcc.stockpile.filtersPanelOpen", "0");

    const { container } = renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Expand collections panel" })).toBeInTheDocument();
    });

    const rightPanel = container.querySelector(`.${styles.stockpileRightPanel}`);
    const content = container.querySelector(`.${styles.stockpileRightPanelContent}`);

    expect(rightPanel?.className).toContain(styles.stockpileRightPanelCollapsed);
    expect(content?.className).toContain(styles.stockpileRightPanelContentCollapsed);
    expect(screen.getByTestId("stockpile-sidebar")).toBeInTheDocument();
  });

  it("toggles collapsed state and persists it to localStorage", async () => {
    const { container } = renderPanel();

    const collapseButton = await screen.findByRole("button", {
      name: "Collapse collections panel",
    });

    fireEvent.click(collapseButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Expand collections panel" })).toBeInTheDocument();
    });

    expect(window.localStorage.getItem("hqcc.stockpile.filtersPanelOpen")).toBe("0");
    expect(
      container.querySelector(`.${styles.stockpileRightPanel}`)?.className,
    ).toContain(styles.stockpileRightPanelCollapsed);

    fireEvent.click(screen.getByRole("button", { name: "Expand collections panel" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Collapse collections panel" }),
      ).toBeInTheDocument();
    });

    expect(window.localStorage.getItem("hqcc.stockpile.filtersPanelOpen")).toBe("1");
    expect(
      container.querySelector(`.${styles.stockpileRightPanel}`)?.className,
    ).not.toContain(styles.stockpileRightPanelCollapsed);
  });
});
