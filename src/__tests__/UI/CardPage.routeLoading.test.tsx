import { act, render, screen, waitFor } from "@testing-library/react";

import CardPage from "@/components/App/pages/CardPage";
import { EditorFormProvider } from "@/components/Providers/EditorFormContext";
import { I18nProvider } from "@/i18n/I18nProvider";

import type { CardRecord } from "@/api/cards";

const mockTrack = jest.fn();
const mockNavigate = jest.fn();
const mockUseGetCard = jest.fn();
const mockSetActiveCard = jest.fn();
const mockSetSelectedTemplateId = jest.fn();

let routeCardId = "card-a";

const cardRecords: Record<string, CardRecord | undefined> = {
  "card-a": {
    id: "card-a",
    templateId: "hero",
    status: "saved",
    name: "Card A",
    title: "Card A",
    description: "Alpha",
    createdAt: 1,
    updatedAt: 1,
  } as CardRecord,
  "card-b": undefined,
};

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ cardId: routeCardId }),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
  }),
}));

jest.mock("@/api/hooks", () => ({
  useGetCard: (...args: unknown[]) => mockUseGetCard(...args),
}));

jest.mock("@/components/App/pages/cards/cardPageActions", () => ({
  createCardPageActions: () => ({
    duplicateCurrentCard: jest.fn(),
    repairCurrentCardThumbnail: jest.fn(),
    saveCurrentCard: jest.fn(),
  }),
}));

jest.mock("@/components/App/pages/cards/useCardFacePairing", () => ({
  useCardFacePairing: () => ({
    activeFrontId: null,
    frontViewToken: 0,
    lastRememberedBackId: null,
    pairedBackId: null,
    pairedFrontCount: 0,
    pairedFrontIds: [],
    setLastRememberedBackId: jest.fn(),
  }),
}));

jest.mock("@/components/App/pages/cards/CardExportController", () => ({
  useCardExportController: () => ({
    exportMenuItems: [],
    onExportPng: jest.fn(),
    exportUi: null,
  }),
}));

jest.mock("@/components/App/RouteShellCapabilitiesContext", () => ({
  noopRouteShellCapabilities: {},
  usePublishRouteShellCapabilities: jest.fn(),
}));

jest.mock("@/components/App/UnsavedChangesGuardContext", () => ({
  usePublishUnsavedChangesGuard: jest.fn(),
  useUnsavedChangesGuardControls: () => ({
    bypassNextNavigation: jest.fn(),
  }),
}));

jest.mock("@/components/Providers/AnalyticsProvider", () => ({
  useAnalytics: () => ({
    track: mockTrack,
  }),
}));

jest.mock("@/components/Providers/CardEditorContext", () => ({
  useCardEditor: () => ({
    state: {
      selectedTemplateId: "hero",
      activeCardIdByTemplate: { hero: "card-a" },
      activeCardStatusByTemplate: { hero: "saved" },
    },
    setActiveCard: mockSetActiveCard,
    setSelectedTemplateId: mockSetSelectedTemplateId,
  }),
}));

jest.mock("@/components/Providers/EditorSaveContext", () => ({
  EditorSaveProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/components/Cards/CardEditor/CardPreviewContainer", () => ({
  __esModule: true,
  default: () => <div data-testid="live-card-preview">Live preview</div>,
}));

jest.mock("@/components/Cards/CardInspector/CardInspector", () => ({
  __esModule: true,
  default: () => <div data-testid="live-card-inspector">Live inspector</div>,
}));

jest.mock("@/components/Cards/CardInspector/TemplateChooser", () => ({
  __esModule: true,
  default: () => <div>Template chooser</div>,
}));

jest.mock("@/components/EditorActionsToolbar", () => ({
  __esModule: true,
  default: () => <div>Editor actions</div>,
}));

jest.mock("@/components/ToolsToolbar", () => ({
  __esModule: true,
  default: () => <div>Tools</div>,
}));

jest.mock("@/components/Providers/PreviewCanvasContext", () => ({
  __esModule: true,
  PreviewCanvasProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function renderSubject() {
  return render(
    <I18nProvider>
      <EditorFormProvider>
        <CardPage />
      </EditorFormProvider>
    </I18nProvider>,
  );
}

describe("CardPage route loading (UI)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    routeCardId = "card-a";
    cardRecords["card-b"] = undefined;
    mockTrack.mockReset();
    mockNavigate.mockReset();
    mockUseGetCard.mockImplementation(({ params }: { params: { id: string } }) => ({
      data: cardRecords[params.id],
      error: null,
    }));
    mockSetActiveCard.mockReset();
    mockSetSelectedTemplateId.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("hides the previous live preview while the next card route is still loading", async () => {
    const view = renderSubject();

    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("live-card-preview")).toBeInTheDocument();
      expect(screen.getByTestId("live-card-inspector")).toBeInTheDocument();
    });

    routeCardId = "card-b";
    view.rerender(
      <I18nProvider>
        <EditorFormProvider>
          <CardPage />
        </EditorFormProvider>
      </I18nProvider>,
    );

    expect(screen.getByTestId("card-preview-route-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("live-card-preview")).not.toBeInTheDocument();
    expect(screen.queryByTestId("live-card-inspector")).not.toBeInTheDocument();

    cardRecords["card-b"] = {
      id: "card-b",
      templateId: "hero",
      status: "saved",
      name: "Card B",
      title: "Card B",
      description: "Bravo",
      createdAt: 2,
      updatedAt: 2,
    } as CardRecord;

    view.rerender(
      <I18nProvider>
        <EditorFormProvider>
          <CardPage />
        </EditorFormProvider>
      </I18nProvider>,
    );

    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("live-card-preview")).toBeInTheDocument();
      expect(screen.getByTestId("live-card-inspector")).toBeInTheDocument();
      expect(screen.queryByTestId("card-preview-route-loading")).not.toBeInTheDocument();
    });
  });
});
