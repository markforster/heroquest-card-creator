import { render } from "@testing-library/react";

import CardPage from "@/components/App/pages/CardPage";
import { EditorFormProvider } from "@/components/Providers/EditorFormContext";
import { I18nProvider } from "@/i18n/I18nProvider";

import type { CardRecord } from "@/api/cards";
import type { PreviewRenderer, PreviewRotationMode } from "@/components/Providers/PreviewRendererContext";
import type { RouteShellCapabilities } from "@/components/App/RouteShellCapabilitiesContext";

const mockTrack = jest.fn();
const mockNavigate = jest.fn();
const mockUseGetCard = jest.fn();
const mockUseCardPageSession = jest.fn();
const mockSetActiveCard = jest.fn();
const mockSetSelectedTemplateId = jest.fn();
const mockUsePublishRouteShellCapabilities = jest.fn();
const mockTogglePreviewRenderer = jest.fn();
const mockSetRotationMode = jest.fn();
const mockRepairCurrentCardThumbnail = jest.fn();
const mockDuplicateCurrentCard = jest.fn();
const mockSaveCurrentCard = jest.fn();

let routeCardId = "card-a";
let previewRenderer: PreviewRenderer = "svg";
let rotationMode: PreviewRotationMode = "pan";

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

jest.mock("@/components/App/pages/cards/CardPageSession", () => ({
  useCardPageSession: (...args: unknown[]) => mockUseCardPageSession(...args),
}));

jest.mock("@/components/App/pages/cards/cardPageActions", () => ({
  createCardPageActions: () => ({
    duplicateCurrentCard: mockDuplicateCurrentCard,
    repairCurrentCardThumbnail: mockRepairCurrentCardThumbnail,
    saveCurrentCard: mockSaveCurrentCard,
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
  usePublishRouteShellCapabilities: (capabilities: RouteShellCapabilities) =>
    mockUsePublishRouteShellCapabilities(capabilities),
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

jest.mock("@/components/Providers/PreviewRendererContext", () => ({
  usePreviewRenderer: () => ({
    previewRenderer,
    rotationMode,
    setRotationMode: mockSetRotationMode,
    togglePreviewRenderer: mockTogglePreviewRenderer,
  }),
}));

jest.mock("@/components/Cards/CardEditor/CardPreviewContainer", () => ({
  __esModule: true,
  default: () => <div data-testid="live-card-preview">Live preview</div>,
}));

jest.mock("@/components/Cards/CardEditor/CardEditorFooterTipController", () => ({
  __esModule: true,
  default: () => null,
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

function getPublishedCapabilities(): RouteShellCapabilities {
  const capabilities = mockUsePublishRouteShellCapabilities.mock.calls.at(-1)?.[0];
  if (!capabilities) {
    throw new Error("Expected CardPage to publish route shell capabilities");
  }
  return capabilities as RouteShellCapabilities;
}

describe("CardPage route shortcuts (UI)", () => {
  beforeEach(() => {
    routeCardId = "card-a";
    previewRenderer = "svg";
    rotationMode = "pan";
    mockTrack.mockReset();
    mockNavigate.mockReset();
    mockUseGetCard.mockImplementation(({ params }: { params: { id: string } }) => ({
      data: cardRecords[params.id],
      error: null,
    }));
    mockUseCardPageSession.mockImplementation(() => ({
      activeCardId: "card-a",
      activeFrontId: null,
      canDuplicate: true,
      canSaveChanges: true,
      currentTemplateId: "hero",
      draftSourceCardId: null,
      duplicateCurrentCard: mockDuplicateCurrentCard,
      editorSaveValue: {
        repairCurrentCardThumbnail: mockRepairCurrentCardThumbnail,
      },
      effectiveFace: "front",
      frontViewToken: 0,
      isDraftRoute: false,
      isEditorDirty: false,
      isRouteLoadingCard: false,
      lastRememberedBackId: null,
      normalizedCardId: "card-a",
      pairedBackId: null,
      pairedFrontCount: 0,
      pairedFrontIds: [],
      routeError: null,
      saveCurrentCard: mockSaveCurrentCard,
      savingMode: "update",
      setLastRememberedBackId: jest.fn(),
    }));
    mockSetActiveCard.mockReset();
    mockSetSelectedTemplateId.mockReset();
    mockUsePublishRouteShellCapabilities.mockReset();
    mockTogglePreviewRenderer.mockReset();
    mockSetRotationMode.mockReset();
    mockRepairCurrentCardThumbnail.mockReset();
    mockDuplicateCurrentCard.mockReset();
    mockSaveCurrentCard.mockReset();
  });

  it("publishes renderer shortcut handlers for the card editor route", () => {
    renderSubject();

    const capabilities = getPublishedCapabilities();

    expect(capabilities.repairCurrentCardThumbnail).toBe(mockRepairCurrentCardThumbnail);
    expect(capabilities.routeShortcutHandlers.v).toEqual(expect.any(Function));
    expect(capabilities.routeShortcutHandlers.m).toEqual(expect.any(Function));
  });

  it("toggles the preview renderer from the published v shortcut", () => {
    renderSubject();

    const handled = getPublishedCapabilities().routeShortcutHandlers.v?.();

    expect(handled).toBe(true);
    expect(mockTogglePreviewRenderer).toHaveBeenCalledTimes(1);
  });

  it("toggles the webgl interaction mode from the published m shortcut", () => {
    previewRenderer = "webgl";
    rotationMode = "pan";
    renderSubject();

    const handled = getPublishedCapabilities().routeShortcutHandlers.m?.();

    expect(handled).toBe(true);
    expect(mockSetRotationMode).toHaveBeenCalledWith("spin");
  });

  it("does not change the interaction mode from the published m shortcut while svg is active", () => {
    previewRenderer = "svg";
    rotationMode = "spin";
    renderSubject();

    const handled = getPublishedCapabilities().routeShortcutHandlers.m?.();

    expect(handled).toBe(false);
    expect(mockSetRotationMode).not.toHaveBeenCalled();
  });
});
