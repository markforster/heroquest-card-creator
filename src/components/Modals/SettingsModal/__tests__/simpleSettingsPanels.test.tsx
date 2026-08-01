const setEnabled = jest.fn();

jest.mock("@/components/Providers/CollectionsTreeSettingsContext", () => ({
  useCollectionsTreeSettings: () => ({ enabled: true, setEnabled }),
}));
jest.mock("@/components/TextFittingSettings/TextFittingSettingsContent", () => ({
  __esModule: true,
  default: () => <div>Text fitting content</div>,
}));
jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

import { fireEvent, render, screen } from "@testing-library/react";

import CollectionsSettingsPanel from "@/components/Modals/SettingsModal/CollectionsSettingsPanel";
import TextFittingSettingsPanel from "@/components/Modals/SettingsModal/TextFittingSettingsPanel";
import TextFittingSettingsPopover from "@/components/TextFittingSettings/TextFittingSettingsPopover";

describe("simple settings panels", () => {
  it("updates collection tree visibility", () => {
    render(<CollectionsSettingsPanel />);

    fireEvent.click(screen.getByRole("checkbox"));
    expect(setEnabled).toHaveBeenCalledWith(false);
    expect(screen.getByText("spells/fire")).toBeInTheDocument();
  });

  it("embeds text fitting settings in panel and popover shells", () => {
    const popoverRef = { current: null };
    const panel = render(<TextFittingSettingsPanel />);
    expect(screen.getByText("Text fitting content")).toBeInTheDocument();
    panel.unmount();

    render(<TextFittingSettingsPopover popoverRef={popoverRef} />);
    expect(screen.getByRole("dialog", { name: "label.textFittingSettings" })).toBeInTheDocument();
    expect(screen.getByText("label.textFittingGlobal")).toBeInTheDocument();
  });
});
