import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import LanguageMenu from "@/components/LanguageMenu";
import { languageLabels, supportedLanguages } from "@/i18n/messages";

let currentLanguage = "en";
const setLanguage = jest.fn();

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    language: currentLanguage,
    setLanguage,
    t: (key: string) => (key === "aria.language" ? "Language" : key),
  }),
}));

describe("LanguageMenu (UI) - detected ordering", () => {
  const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  beforeEach(() => {
    window.localStorage.clear();
    setLanguage.mockClear();
    currentLanguage = "en";
  });

  afterEach(() => {
    if (originalNavigatorDescriptor) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDescriptor);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).navigator;
    }
  });

  it("moves detected language to the end when a stored selection exists", async () => {
    window.localStorage.setItem("hqcc.language", "en");
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { languages: ["sv-SE"], language: "sv-SE" },
    });

    render(<LanguageMenu isCollapsed={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Language" }));

    await waitFor(() => {
      expect(screen.getAllByRole("menuitem").length).toBeGreaterThan(1);
    });

    const options = screen.getAllByRole("menuitem");
    const labels = options.map((option) => option.textContent);
    expect(labels).not.toContain("🇬🇧 English");
    expect(labels[labels.length - 1]).toBe("🇸🇪 Svenska");
  });

  it("moves detected language to the end when no stored language exists", async () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { languages: ["sv-SE"], language: "sv-SE" },
    });

    render(<LanguageMenu isCollapsed={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Language" }));

    await waitFor(() => {
      expect(screen.getAllByRole("menuitem").length).toBeGreaterThan(1);
    });

    const options = screen.getAllByRole("menuitem");
    const labels = options.map((option) => option.textContent);
    const sortKey = (label: string) => {
      const trimmed = label.trim();
      const firstSpace = trimmed.indexOf(" ");
      if (firstSpace === -1) return trimmed;
      return trimmed.slice(firstSpace + 1).trim();
    };
    const expected = supportedLanguages
      .filter((code) => code !== currentLanguage)
      .map((code) => languageLabels[code] ?? code.toUpperCase())
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b), undefined, { sensitivity: "base" }));

    const expectedDetected = languageLabels.sv;
    const expectedWithoutDetected = expected.filter((label) => label !== expectedDetected);
    expect(labels).toEqual([...expectedWithoutDetected, expectedDetected]);
  });
});
