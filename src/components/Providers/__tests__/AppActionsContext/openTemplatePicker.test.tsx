import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AppActionsProvider, useAppActions } from "@/components/Providers/AppActionsContext";
import { AnalyticsProvider } from "@/components/Providers/AnalyticsProvider";

const navigate = jest.fn();
const setSelectedTemplateId = jest.fn();
const setSingleDraft = jest.fn();
const setActiveCard = jest.fn();
const setTemplateDirty = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

jest.mock("@/components/Providers/CardEditorContext", () => ({
  __esModule: true,
  useCardEditor: () => ({
    state: {
      selectedTemplateId: "hero",
      activeCardIdByTemplate: {},
      isDirtyByTemplate: {},
    },
    setSelectedTemplateId,
    setSingleDraft,
    setActiveCard,
    setTemplateDirty,
    loadCardIntoEditor: jest.fn(),
  }),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    language: "en",
    t: (key: string) => key,
  }),
}));

jest.mock("@/components/TemplatePicker", () => ({
  __esModule: true,
  default: ({
    isOpen,
    onApply,
  }: {
    isOpen: boolean;
    onApply: (templateId: string) => void;
  }) =>
    isOpen ? (
      <button type="button" onClick={() => onApply("monster")}>
        Apply template
      </button>
    ) : null,
}));

jest.mock("@/components/Assets/AssetsModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/Modals/SettingsModal/SettingsModal", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/Stockpile", () => ({ __esModule: true, StockpileModal: () => null }));
jest.mock("@/components/Modals/RecentCardsModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/Modals/ConfirmModal", () => ({ __esModule: true, default: () => null }));

function Harness() {
  const { openTemplatePicker } = useAppActions();
  return (
    <button type="button" onClick={openTemplatePicker}>
      Open template picker
    </button>
  );
}

describe("AppActionsProvider openTemplatePicker", () => {
  beforeEach(() => {
    navigate.mockClear();
    setSelectedTemplateId.mockClear();
    setSingleDraft.mockClear();
    setActiveCard.mockClear();
    setTemplateDirty.mockClear();
  });

  it("navigates to /cards/new when applying a template", () => {
    render(
      <MemoryRouter>
        <AnalyticsProvider gaId={undefined}>
          <AppActionsProvider>
            <Harness />
          </AppActionsProvider>
        </AnalyticsProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open template picker" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply template" }));

    expect(setSelectedTemplateId).toHaveBeenCalledWith("monster");
    expect(setSingleDraft).toHaveBeenCalledTimes(1);
    expect(setActiveCard).toHaveBeenCalledWith("monster", null, null);
    expect(setTemplateDirty).toHaveBeenCalledWith("monster", false);
    expect(navigate).toHaveBeenCalledWith("/cards/new");
  });
});
