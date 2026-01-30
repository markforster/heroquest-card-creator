import { fireEvent, render, screen } from "@testing-library/react";

import LeftNav from "@/components/LeftNav";

const openAssets = jest.fn();
const openStockpile = jest.fn();
const openSettings = jest.fn();

jest.mock("@/components/AppActionsContext", () => ({
  __esModule: true,
  useAppActions: () => ({
    openAssets,
    openStockpile,
    openSettings,
  }),
}));

jest.mock("@/components/LanguageMenu", () => ({
  __esModule: true,
  default: () => <div data-testid="language-menu" />,
}));

jest.mock("@/components/PreviewModeContext", () => ({
  __esModule: true,
  usePreviewMode: () => ({
    previewMode: "legacy",
    togglePreviewMode: jest.fn(),
  }),
  previewModeFlags: {
    SHOW_BLUEPRINTS_TOGGLE: false,
    USE_BLUEPRINTS: false,
  },
}));

jest.mock("@/components/InspectorModeContext", () => ({
  __esModule: true,
  useInspectorMode: () => ({
    inspectorMode: "legacy",
    toggleInspectorMode: jest.fn(),
  }),
  inspectorModeFlags: {
    SHOW_INSPECTOR_TOGGLE: false,
    USE_GENERIC_INSPECTOR: false,
  },
}));

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => {
      const lookup: Record<string, string> = {
        "actions.cards": "Cards",
        "actions.assets": "Assets",
        "actions.settings": "Settings",
        "tooltip.openCards": "Browse and load saved cards",
        "tooltip.openAssets": "Open the assets manager",
        "tooltip.openSettings": "Open global settings",
        "app.title": "HeroQuest Card Creator",
      };
      return lookup[key] ?? key;
    },
  }),
}));

describe("LeftNav (UI)", () => {
  beforeEach(() => {
    openAssets.mockClear();
    openStockpile.mockClear();
    openSettings.mockClear();
  });

  it("renders actions and triggers handlers", () => {
    render(<LeftNav />);

    fireEvent.click(screen.getByRole("button", { name: "Browse and load saved cards" }));
    expect(openStockpile).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Open the assets manager" }));
    expect(openAssets).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Open global settings" }));
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it("renders the language menu placeholder", () => {
    render(<LeftNav />);
    expect(screen.getByTestId("language-menu")).toBeInTheDocument();
  });
});
