import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import IndexPage from "@/app/page";
import { EditorFormProvider } from "@/components/Providers/EditorFormContext";

const createCard = jest.fn();
const getCard = jest.fn();
const listCards = jest.fn();
const listPairs = jest.fn();
const touchCardLastViewed = jest.fn();
const updateCard = jest.fn();
const updateCardThumbnail = jest.fn();
const createPair = jest.fn();
const deletePair = jest.fn();

const mockSetActiveCard = jest.fn();
const mockSetSelectedTemplateId = jest.fn();

const mockCardEditorContext = {
  state: {
    selectedTemplateId: "hero",
    activeCardIdByTemplate: {},
    activeCardStatusByTemplate: {},
  },
  setActiveCard: mockSetActiveCard,
  setSelectedTemplateId: mockSetSelectedTemplateId,
};

jest.mock("@/components/Providers/CardEditorContext", () => ({
  __esModule: true,
  CardEditorProvider: ({ children }: { children: React.ReactNode }) => children,
  useCardEditor: () => mockCardEditorContext,
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    createCard: (...args: unknown[]) => createCard(...args),
    getCard: (...args: unknown[]) => getCard(...args),
    listCards: (...args: unknown[]) => listCards(...args),
    listPairs: (...args: unknown[]) => listPairs(...args),
    touchCardLastViewed: (...args: unknown[]) => touchCardLastViewed(...args),
    updateCard: (...args: unknown[]) => updateCard(...args),
    updateCardThumbnail: (...args: unknown[]) => updateCardThumbnail(...args),
    createPair: (...args: unknown[]) => createPair(...args),
    deletePair: (...args: unknown[]) => deletePair(...args),
  },
}));

jest.mock("@/api/hooks", () => ({
  useGetCard: () => ({ data: undefined, error: null }),
}));

jest.mock("@/components/Providers/AssetHashIndexProvider", () => ({
  __esModule: true,
  AssetHashIndexProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/components/Providers/AnalyticsProvider", () => ({
  __esModule: true,
  useAnalytics: () => ({
    track: jest.fn(),
  }),
}));
jest.mock("@/components/Providers/LocalStorageProvider", () => ({
  __esModule: true,
  LocalStorageProvider: ({ children }: { children: React.ReactNode }) => children,
  useLocalStorageBoolean: () => [false, jest.fn()],
}));
jest.mock("@/components/Providers/DebugVisualsContext", () => ({
  __esModule: true,
  DebugVisualsProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/components/Providers/PreviewRendererContext", () => ({
  __esModule: true,
  PreviewRendererProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/components/Providers/WebglPreviewSettingsContext", () => ({
  __esModule: true,
  WebglPreviewSettingsProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/components/Providers/ThemeProvider", () => ({
  __esModule: true,
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/components/Providers/ExportSettingsContext", () => ({
  __esModule: true,
  useExportSettingsState: () => ({
    settings: {
      bleed: { enabled: false, bleedPx: 0, askBeforeExport: false },
      cropMarks: { enabled: false, color: "#000000", style: "lines" },
      cutMarks: { enabled: false, color: "#000000" },
      roundedCorners: false,
    },
  }),
}));
jest.mock("@/components/Providers/TextFittingPreferencesContext", () => ({
  __esModule: true,
  TextFittingPreferencesProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/components/Providers/MissingAssetsContext", () => ({
  __esModule: true,
  MissingAssetsProvider: ({ children }: { children: React.ReactNode }) => children,
  useMissingAssets: () => ({ missingAssetsReport: [] }),
}));
jest.mock("@/components/Providers/LibraryTransferContext", () => ({
  __esModule: true,
  LibraryTransferProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/components/Providers/AppActionsContext", () => ({
  __esModule: true,
  AppActionsProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/components/Providers/EditorSaveContext", () => ({
  __esModule: true,
  EditorSaveProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/components/Providers/PreviewCanvasContext", () => ({
  __esModule: true,
  PreviewCanvasProvider: ({ children }: { children: React.ReactNode }) => children,
}));

beforeAll(() => {
  if (typeof Request === "undefined") {
    class MockRequest {
      body: BodyInit | null;
      credentials: RequestCredentials;
      headers: Headers;
      method: string;
      mode: RequestMode;
      signal: AbortSignal | null;
      url: string;

      constructor(input: string | URL, init: RequestInit = {}) {
        this.url = String(input);
        this.method = (init.method ?? "GET").toUpperCase();
        this.headers = new Headers(init.headers);
        this.body = init.body ?? null;
        this.signal = init.signal ?? null;
        this.mode = init.mode ?? "same-origin";
        this.credentials = init.credentials ?? "same-origin";
      }
    }

    Object.defineProperty(globalThis, "Request", {
      configurable: true,
      writable: true,
      value: MockRequest,
    });
  }
});

jest.mock("@/components/DatabaseVersionGate", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/components/common/EscapeStackProvider", () => ({
  __esModule: true,
  EscapeStackProvider: ({ children }: { children: React.ReactNode }) => children,
  useEscapeModalAware: () => undefined,
}));

jest.mock("@/components/Layout/HeaderWithTemplatePicker", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/Layout/LeftNav", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/Layout/MainFooter", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/Assets", () => ({
  __esModule: true,
  AssetsRoutePanels: () => <div>Assets Route</div>,
}));
jest.mock("@/components/Stockpile", () => ({
  __esModule: true,
  StockpileMainPanel: () => <div>Stockpile</div>,
}));
jest.mock("@/components/Decks/DecksRoutePanels", () => ({
  __esModule: true,
  default: () => <div>Decks Route</div>,
}));

jest.mock("@/components/Cards/CardEditor/CardPreviewContainer", () => ({
  __esModule: true,
  default: () => <div>Preview</div>,
}));
jest.mock("@/components/Cards/CardInspector/CardInspector", () => ({
  __esModule: true,
  default: function MockCardInspector() {
    const { useFormContext } = jest.requireActual("react-hook-form") as typeof import("react-hook-form");
    const { register } = useFormContext();
    return <input aria-label="Title" {...register("title")} />;
  },
}));
jest.mock("@/components/Cards/CardInspector/TemplateChooser", () => ({
  __esModule: true,
  default: () => <div>Template Chooser</div>,
}));

jest.mock("@/components/EditorActionsToolbar", () => ({
  __esModule: true,
  default: ({ onSaveChanges }: { onSaveChanges: () => void }) => (
    <button type="button" onClick={onSaveChanges}>
      Save
    </button>
  ),
}));

jest.mock("@/components/Modals/WelcomeTemplateModal", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/Modals/ConfirmModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/ExportProgressOverlay", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/Cards/CardPreview", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/common/CardThumbnail", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/common/Notice", () => ({
  __esModule: true,
  WarningNotice: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/components/ToolsToolbar", () => ({ __esModule: true, default: () => null }));

jest.mock("@/lib/export-face-ids", () => ({
  __esModule: true,
  exportFaceIdsToZip: jest.fn(),
}));
jest.mock("@/lib/export-assets-cache", () => ({
  __esModule: true,
  buildMissingAssetsReport: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/lib/thumbnail-jpeg-migration", () => ({
  __esModule: true,
  startThumbnailJpegMigration: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/decks-service", () => ({
  __esModule: true,
  repairOrphanDeckEntries: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/indexeddb-size-tracker", () => ({
  __esModule: true,
  clearDbEstimateCache: jest.fn(),
  runFullDbEstimate: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    language: "en",
    t: (key: string) => key,
  }),
}));

describe("IndexPage draft route", () => {
  beforeEach(() => {
    window.location.hash = "#/cards/new";
    createCard.mockReset();
    getCard.mockReset();
    listCards.mockReset();
    listPairs.mockReset();
    touchCardLastViewed.mockReset();
    updateCard.mockReset();
    updateCardThumbnail.mockReset();
    createPair.mockReset();
    deletePair.mockReset();

    mockSetActiveCard.mockReset();
    mockSetSelectedTemplateId.mockReset();

    listCards.mockResolvedValue([]);
    listPairs.mockResolvedValue([]);
    getCard.mockResolvedValue(null);
    touchCardLastViewed.mockResolvedValue(null);
  });

  it("does not attempt saved-card DB load on /cards/new", async () => {
    render(
      <EditorFormProvider>
        <IndexPage />
      </EditorFormProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText("Card not found")).not.toBeInTheDocument();
    });
    expect(getCard).not.toHaveBeenCalled();
  });

  it("redirects to /cards/:id after first save from /cards/new", async () => {
    createCard.mockResolvedValue({ id: "card-1", status: "saved" });
    getCard.mockResolvedValue({
      id: "card-1",
      templateId: "hero",
      status: "saved",
      title: "Saved card",
      name: "Saved card",
      nameLower: "saved card",
      updatedAt: 1,
      data: {},
    });

    render(
      <EditorFormProvider>
        <IndexPage />
      </EditorFormProvider>,
    );

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Saved card" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(window.location.hash).toBe("#/cards/card-1");
    });
    expect(createCard).toHaveBeenCalledTimes(1);
  });
});
