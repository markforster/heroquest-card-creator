import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import LeftNav from "@/components/Layout/LeftNav";

const openAssets = jest.fn();
const openRecent = jest.fn();
const openSettings = jest.fn();
const openTemplatePicker = jest.fn();

jest.mock("@/components/Providers/AppActionsContext", () => ({
  __esModule: true,
  useAppActions: () => ({
    openAssets,
    openRecent,
    openSettings,
    openTemplatePicker,
    hasTemplate: true,
    isRecentOpen: false,
    isSettingsOpen: false,
    isTemplatePickerOpen: false,
  }),
}));

jest.mock("@/components/Providers/CardEditorContext", () => ({
  __esModule: true,
  useCardEditor: () => ({
    state: {
      selectedTemplateId: "hero",
      activeCardIdByTemplate: {
        hero: "card-1",
      },
    },
  }),
}));

jest.mock("@/components/Providers/EditorSaveContext", () => ({
  __esModule: true,
  useEditorSave: () => ({
    repairCurrentCardThumbnail: jest.fn(),
  }),
}));

jest.mock("@/components/LanguageMenu", () => ({
  __esModule: true,
  default: () => <div data-testid="language-menu" />,
}));

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => {
      const lookup: Record<string, string> = {
        "actions.cards": "Cards",
        "actions.assets": "Assets",
        "actions.settings": "Settings",
        "actions.recentCards": "Recent cards",
        "tooltip.openCards": "Browse and load saved cards",
        "tooltip.openAssets": "Open the assets manager",
        "tooltip.openSettings": "Open global settings",
        "tooltip.chooseTemplate": "Choose template",
        "tooltip.createFromTemplate": "Create from template",
        "app.title": "HeroQuest Card Creator",
      };
      return lookup[key] ?? key;
    },
  }),
}));

describe("LeftNav (UI)", () => {
  beforeEach(() => {
    openAssets.mockClear();
    openRecent.mockClear();
    openSettings.mockClear();
    openTemplatePicker.mockClear();
  });

  it("renders actions and triggers handlers", () => {
    render(
      <MemoryRouter>
        <LeftNav />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Browse and load saved cards" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the assets manager" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Recent cards" }));
    expect(openRecent).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Open global settings" }));
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it("renders the language menu placeholder", () => {
    render(
      <MemoryRouter>
        <LeftNav />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("language-menu")).toBeInTheDocument();
  });
});
