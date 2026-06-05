import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import LanguageMenu from "@/components/LanguageMenu";

let currentLanguage = "en";
const setLanguage = jest.fn();

const languageNameTranslations: Record<string, Record<string, string>> = {
  en: {
    "languages.de": "German",
    "languages.da": "Danish",
  },
  da: {
    "languages.de": "Tysk",
    "languages.da": "Dansk",
  },
  ru: {
    "languages.de": "Немецкий",
    "languages.da": "Датский",
  },
};

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    language: currentLanguage,
    setLanguage,
    t: (key: string) => {
      if (key === "aria.language") return "Language";
      return languageNameTranslations[currentLanguage]?.[key] ?? key;
    },
  }),
}));

describe("LanguageMenu (UI) - localized hover titles", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setLanguage.mockClear();
  });

  it("keeps native visible labels while showing English hover names", async () => {
    currentLanguage = "en";

    render(<LanguageMenu isCollapsed={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Language" }));

    await waitFor(() => {
      expect(screen.getAllByRole("menuitem").length).toBeGreaterThan(1);
    });

    const germanOption = screen.getByRole("menuitem", { name: "🇩🇪 Deutsch" });
    expect(germanOption).toHaveAttribute("title", "German");
  });

  it("shows Danish-localized hover names when UI language is Danish", async () => {
    currentLanguage = "da";

    render(<LanguageMenu isCollapsed={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Language" }));

    await waitFor(() => {
      expect(screen.getAllByRole("menuitem").length).toBeGreaterThan(1);
    });

    const germanOption = screen.getByRole("menuitem", { name: "🇩🇪 Deutsch" });
    expect(germanOption).toHaveAttribute("title", "Tysk");
  });

  it("shows Russian-localized hover names for Danish when UI language is Russian", async () => {
    currentLanguage = "ru";

    render(<LanguageMenu isCollapsed={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Language" }));

    await waitFor(() => {
      expect(screen.getAllByRole("menuitem").length).toBeGreaterThan(1);
    });

    const danishOption = screen.getByRole("menuitem", { name: "🇩🇰 Dansk" });
    expect(danishOption).toHaveAttribute("title", "Датский");
  });
});
