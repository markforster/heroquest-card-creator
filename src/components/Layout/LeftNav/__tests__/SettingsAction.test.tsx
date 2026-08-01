const openSettings = jest.fn();
const track = jest.fn();

jest.mock("@/components/Layout/LeftNav/NavActionButton", () => ({
  __esModule: true,
  default: ({
    label,
    onClick,
    isActive,
  }: {
    label: string;
    onClick: () => void;
    isActive: boolean;
  }) => (
    <button type="button" onClick={onClick} aria-pressed={isActive}>
      {label}
    </button>
  ),
}));
jest.mock("@/components/Providers/AnalyticsProvider", () => ({
  useAnalytics: () => ({ track }),
}));
jest.mock("@/components/Providers/AppActionsContext", () => ({
  useAppActions: () => ({ openSettings, isSettingsOpen: true }),
}));
jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

import { fireEvent, render, screen } from "@testing-library/react";

import SettingsAction from "@/components/Layout/LeftNav/SettingsAction";

describe("SettingsAction", () => {
  it("tracks and opens settings", () => {
    render(<SettingsAction />);

    const button = screen.getByRole("button", { name: "actions.settings" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    expect(track).toHaveBeenCalledWith("page_view", {
      page_path: "/settings",
      page_title: "Settings",
    });
    expect(openSettings).toHaveBeenCalled();
  });
});
