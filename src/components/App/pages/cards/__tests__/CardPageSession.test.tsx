const createCardPageActions = jest.fn();
const useGetCard = jest.fn();
const useParams = jest.fn();

jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({}) }));
jest.mock("react-router-dom", () => ({
  useParams: () => useParams(),
  useNavigate: () => jest.fn(),
}));
jest.mock("react-hook-form", () => ({
  useFormState: () => ({ isDirty: true }),
  useWatch: () => ({ name: "Named card", face: "front" }),
}));
jest.mock("@/api/hooks", () => ({
  useGetCard: (...args: unknown[]) => useGetCard(...args),
}));
jest.mock("@/components/App/pages/cards/cardPageActions", () => ({
  createCardPageActions: (...args: unknown[]) => createCardPageActions(...args),
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
jest.mock("@/components/App/UnsavedChangesGuardContext", () => ({
  useUnsavedChangesGuardControls: () => ({ bypassNextNavigation: jest.fn() }),
}));
jest.mock("@/components/Providers/AnalyticsProvider", () => ({
  useAnalytics: () => ({ track: jest.fn() }),
}));
jest.mock("@/components/Providers/CopyrightSettingsContext", () => ({
  useCopyrightSettings: () => ({ getTemplateDefault: jest.fn(), isReady: false }),
}));
jest.mock("@/components/Providers/CardEditorContext", () => ({
  useCardEditor: () => ({
    state: {
      selectedTemplateId: "hero",
      activeCardIdByTemplate: {},
      activeCardStatusByTemplate: {},
    },
    setActiveCard: jest.fn(),
    setSelectedTemplateId: jest.fn(),
  }),
}));
jest.mock("@/components/Providers/EditorFormContext", () => ({
  useEditorForm: () => ({
    methods: { control: {}, getValues: jest.fn() },
    resetWithSaved: jest.fn(),
  }),
}));

import { renderHook } from "@testing-library/react";

import { useCardPageSession } from "@/components/App/pages/cards/CardPageSession";

describe("useCardPageSession", () => {
  beforeEach(() => {
    useParams.mockReset().mockReturnValue({});
    useGetCard.mockReset().mockReturnValue({ data: undefined, error: null });
    createCardPageActions.mockReset().mockReturnValue({
      duplicateCurrentCard: jest.fn(),
      repairCurrentCardThumbnail: jest.fn(),
      saveCurrentCard: jest.fn(),
    });
  });

  it("derives an editable unsaved session when no card route is active", () => {
    const { result } = renderHook(() => useCardPageSession({ previewRef: { current: null } }));

    expect(result.current).toMatchObject({
      normalizedCardId: null,
      isDraftRoute: false,
      isRouteLoadingCard: false,
      currentTemplateId: "hero",
      effectiveFace: "front",
      canSaveChanges: true,
      canDuplicate: false,
      routeError: null,
    });
    expect(useGetCard).toHaveBeenCalledWith({ params: { id: "" } }, { enabled: false });
    expect(createCardPageActions).toHaveBeenCalled();
  });

  it("recognizes a saved-card route as loading until it is applied", () => {
    useParams.mockReturnValue({ cardId: "card-1" });

    const { result } = renderHook(() => useCardPageSession({ previewRef: { current: null } }));

    expect(result.current.normalizedCardId).toBe("card-1");
    expect(result.current.isRouteLoadingCard).toBe(true);
    expect(useGetCard).toHaveBeenCalledWith({ params: { id: "card-1" } }, { enabled: true });
  });
});
