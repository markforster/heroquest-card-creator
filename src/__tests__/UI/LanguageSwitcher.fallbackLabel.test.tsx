import { render, screen } from "@testing-library/react";

import { useI18n } from "@/i18n/I18nProvider";

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: jest.fn(),
}));

jest.mock("@/i18n/messages", () => ({
  supportedLanguages: ["xx"],
  languageLabels: {},
}));

import LanguageSwitcher from "@/components/LanguageSwitcher";

describe("LanguageSwitcher (UI) - label fallback", () => {
  it("falls back to code.toUpperCase() when languageLabels has no entry", () => {
    (useI18n as jest.Mock).mockReturnValue({
      language: "xx",
      setLanguage: jest.fn(),
      t: (key: string) => (key === "aria.language" ? "Language" : key),
    });

    render(<LanguageSwitcher />);

    expect(screen.getByRole("option", { name: "XX" })).toBeInTheDocument();
  });
});

