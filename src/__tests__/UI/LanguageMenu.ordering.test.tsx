import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import LanguageMenu from "@/components/LanguageMenu";
import { languageLabels, visibleLanguages } from "@/i18n/messages";

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

  it("renders the detected language in a separate section when a stored selection exists", async () => {
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

    const grid = document.querySelector(".leftNavMenuGrid");
    const detectedSection = document.querySelector(".leftNavMenuDetectedSection");
    expect(grid).not.toBeNull();
    expect(detectedSection).not.toBeNull();

    const gridLabels = Array.from(grid!.querySelectorAll('[role=\"menuitem\"]')).map(
      (option) => option.textContent,
    );
    expect(gridLabels).not.toContain("🇬🇧 English");
    expect(gridLabels).not.toContain("🇸🇪 Svenska");

    const detectedButton = detectedSection!.querySelector('[role=\"menuitem\"]');
    expect(detectedButton).not.toBeNull();
    expect(detectedButton?.textContent).toBe("🇸🇪 Svenska");
  });

  it("keeps the normal grid ordering and separates the detected language when no stored language exists", async () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { languages: ["sv-SE"], language: "sv-SE" },
    });

    render(<LanguageMenu isCollapsed={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Language" }));

    await waitFor(() => {
      expect(screen.getAllByRole("menuitem").length).toBeGreaterThan(1);
    });

    const grid = document.querySelector(".leftNavMenuGrid");
    const detectedSection = document.querySelector(".leftNavMenuDetectedSection");
    expect(grid).not.toBeNull();
    expect(detectedSection).not.toBeNull();

    const labels = Array.from(grid!.querySelectorAll('[role=\"menuitem\"]')).map(
      (option) => option.textContent,
    );
    const sortKey = (label: string) => {
      const trimmed = label.trim();
      const firstSpace = trimmed.indexOf(" ");
      if (firstSpace === -1) return trimmed;
      return trimmed.slice(firstSpace + 1).trim();
    };
    const expected = visibleLanguages
      .filter((code) => code !== currentLanguage)
      .map((code) => languageLabels[code] ?? code.toUpperCase())
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b), undefined, { sensitivity: "base" }));

    const expectedDetected = languageLabels.sv;
    const expectedWithoutDetected = expected.filter((label) => label !== expectedDetected);
    expect(labels).toEqual(expectedWithoutDetected);
    expect(detectedSection!.querySelector('[role=\"menuitem\"]')?.textContent).toBe(expectedDetected);
  });

  it("does not render a detected section when detected language matches the current language", async () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { languages: ["en-GB"], language: "en-GB" },
    });

    render(<LanguageMenu isCollapsed={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Language" }));

    await waitFor(() => {
      expect(screen.getAllByRole("menuitem").length).toBeGreaterThan(1);
    });

    expect(document.querySelector(".leftNavMenuGrid")).not.toBeNull();
    expect(document.querySelector(".leftNavMenuDetectedSection")).toBeNull();
  });
});
