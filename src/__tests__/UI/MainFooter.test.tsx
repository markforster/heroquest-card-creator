import { render, screen } from "@testing-library/react";

import MainFooter from "@/components/MainFooter";
import { I18nProvider } from "@/i18n/I18nProvider";

jest.mock("@/version", () => ({
  APP_VERSION: "0.0.0-test",
}));

jest.mock("@/components/HelpModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/ReleaseNotesModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/hooks/useIsTauriApp", () => ({
  __esModule: true,
  default: () => false,
}));


function renderMainFooter() {
  return render(
    <I18nProvider>
      <MainFooter />
    </I18nProvider>,
  );
}

describe("MainFooter (UI)", () => {
  it("shows the app version", () => {
    renderMainFooter();
    expect(screen.getByText("v0.0.0-test")).toBeInTheDocument();
  });

  it("renders help, about, and download links", () => {
    renderMainFooter();
    expect(screen.getByRole("button", { name: "Help" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "About" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download" })).toBeInTheDocument();
  });

  it("shows the web/tauri indicator", () => {
    renderMainFooter();
    expect(screen.getByText("App: Web")).toBeInTheDocument();
  });
});
