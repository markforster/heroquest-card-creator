import { act, fireEvent, screen, waitFor } from "@testing-library/react";

import { useI18n } from "@/i18n/I18nProvider";
import { LANGUAGE_STORAGE_KEY } from "@/i18n/getInitialLanguage";
import type { MessageKey, SupportedLanguage } from "@/i18n/messages";
import { renderWithI18n } from "@/test/renderWithI18n";

function Harness() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div>
      <div data-testid="language">{language}</div>
      <div data-testid="settings">{t("actions.settings")}</div>
      <div data-testid="missing">{t("__missing__.key" as MessageKey)}</div>
      <button type="button" onClick={() => setLanguage("fr")}>
        set-fr
      </button>
      <button type="button" onClick={() => setLanguage("xx" as SupportedLanguage)}>
        set-invalid
      </button>
    </div>
  );
}

describe("I18nProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("initializes from stored language and renders translated strings", async () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "fr");

    renderWithI18n(<Harness />);

    await waitFor(() => expect(screen.getByTestId("language")).toHaveTextContent("fr"));
    expect(screen.getByTestId("settings")).toHaveTextContent("Options");
  });

  it("updates language and localStorage through setLanguage", async () => {
    renderWithI18n(<Harness />);

    fireEvent.click(screen.getByText("set-fr"));

    await waitFor(() => expect(screen.getByTestId("language")).toHaveTextContent("fr"));
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("fr");
  });

  it("falls back to en for unsupported selections and surfaces missing keys", async () => {
    renderWithI18n(<Harness />);

    await act(async () => {
      fireEvent.click(screen.getByText("set-invalid"));
    });

    await waitFor(() => expect(screen.getByTestId("language")).toHaveTextContent("en"));
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
    expect(screen.getByTestId("missing")).toHaveTextContent("__missing__.key");
  });
});
