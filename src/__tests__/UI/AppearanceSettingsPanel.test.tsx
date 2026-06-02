import { fireEvent, render, screen } from "@testing-library/react";

import AppearanceSettingsPanel from "@/components/Modals/SettingsModal/AppearanceSettingsPanel";
import { LocalStorageProvider } from "@/components/Providers/LocalStorageProvider";
import { ThemeProvider } from "@/components/Providers/ThemeProvider";
import { I18nProvider } from "@/i18n/I18nProvider";
import { TYPOGRAPHY_NUMERIC_STORAGE_KEYS } from "@/lib/typography-settings";

function renderPanel() {
  return render(
    <I18nProvider>
      <LocalStorageProvider>
        <ThemeProvider>
          <AppearanceSettingsPanel />
        </ThemeProvider>
      </LocalStorageProvider>
    </I18nProvider>,
  );
}

describe("AppearanceSettingsPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it("renders typography sections and defaults the new toggles to enabled", () => {
    renderPanel();

    expect(screen.getByText("Typography")).toBeInTheDocument();
    expect(screen.getByText("Titles")).toBeInTheDocument();
    expect(screen.getByText("Stats")).toBeInTheDocument();
    expect(screen.getByText(/Body text keeps the original numeral behavior/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText("Use aligned numeral style")).toHaveLength(2);
    expect(screen.getAllByLabelText("Use fixed-width numerals")).toHaveLength(2);

    for (const input of screen.getAllByLabelText("Use aligned numeral style")) {
      expect(input).toBeChecked();
    }
    for (const input of screen.getAllByLabelText("Use fixed-width numerals")) {
      expect(input).toBeChecked();
    }
  });

  it("reflects stored values and persists toggle changes", () => {
    window.localStorage.setItem(TYPOGRAPHY_NUMERIC_STORAGE_KEYS.titleAlignedNumerals, "0");
    window.localStorage.setItem(TYPOGRAPHY_NUMERIC_STORAGE_KEYS.statFixedWidthNumerals, "0");

    renderPanel();

    const alignedToggles = screen.getAllByLabelText("Use aligned numeral style");
    const fixedWidthToggles = screen.getAllByLabelText("Use fixed-width numerals");

    expect(alignedToggles[0]).not.toBeChecked();
    expect(alignedToggles[1]).toBeChecked();
    expect(fixedWidthToggles[0]).toBeChecked();
    expect(fixedWidthToggles[1]).not.toBeChecked();

    fireEvent.click(fixedWidthToggles[0]);

    expect(window.localStorage.getItem(TYPOGRAPHY_NUMERIC_STORAGE_KEYS.titleFixedWidthNumerals)).toBe(
      "0",
    );
    expect(fixedWidthToggles[0]).not.toBeChecked();
  });
});
