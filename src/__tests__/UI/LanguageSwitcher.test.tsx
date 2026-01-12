import { fireEvent, render, screen } from "@testing-library/react";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import { supportedLanguages } from "@/i18n/messages";
import { useI18n } from "@/i18n/I18nProvider";

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: jest.fn(),
}));

describe("LanguageSwitcher (UI)", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("renders a combobox with the i18n aria label and current value", () => {
    (useI18n as jest.Mock).mockReturnValue({
      language: "en",
      setLanguage: jest.fn(),
      t: (key: string) => (key === "aria.language" ? "Language" : key),
    });

    render(<LanguageSwitcher className="test-class" />);

    const select = screen.getByRole("combobox", { name: "Language" });
    expect(select).toHaveClass("test-class");
    expect(select).toHaveValue("en");
  });

  it("renders all supported languages as options", () => {
    (useI18n as jest.Mock).mockReturnValue({
      language: "en",
      setLanguage: jest.fn(),
      t: (key: string) => (key === "aria.language" ? "Language" : key),
    });

    render(<LanguageSwitcher />);

    const select = screen.getByRole("combobox", { name: "Language" });
    const options = Array.from(select.querySelectorAll("option"));
    expect(options).toHaveLength(supportedLanguages.length);

    // Spot-check a couple of common values.
    expect(options.some((o) => o.value === "en")).toBe(true);
    expect(options.some((o) => o.value === "fr")).toBe(true);
  });

  it("calls setLanguage and blurs the select on change", () => {
    const setLanguage = jest.fn();
    (useI18n as jest.Mock).mockReturnValue({
      language: "en",
      setLanguage,
      t: (key: string) => (key === "aria.language" ? "Language" : key),
    });

    const blurSpy = jest.spyOn(HTMLSelectElement.prototype, "blur").mockImplementation(() => {});

    render(<LanguageSwitcher />);

    const select = screen.getByRole("combobox", { name: "Language" });
    fireEvent.change(select, { target: { value: "fr" } });

    expect(setLanguage).toHaveBeenCalledWith("fr");
    expect(blurSpy).toHaveBeenCalledTimes(1);

    blurSpy.mockRestore();
  });
});

