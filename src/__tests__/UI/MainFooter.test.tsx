import { fireEvent, render, screen } from "@testing-library/react";

import MainFooter from "@/components/Layout/MainFooter";
import { I18nProvider } from "@/i18n/I18nProvider";

const mockUseMediaQuery = jest.fn();
let mockIsMobile = false;
let mockIsTablet = false;

jest.mock("@/version", () => ({
  APP_VERSION: "0.0.0-test",
}));

jest.mock("react-device-detect", () => ({
  get isMobile() {
    return mockIsMobile;
  },
  get isTablet() {
    return mockIsTablet;
  },
}));

jest.mock("@/components/Modals/HelpModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Modals/ReleaseNotesModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/hooks/useIsTauriApp", () => ({
  __esModule: true,
  default: () => false,
}));

jest.mock("@/components/Providers/AnalyticsProvider", () => ({
  useAnalytics: () => ({
    track: jest.fn(),
  }),
}));

jest.mock("@/components/Layout/LeftNav/useMediaQuery", () => ({
  useMediaQuery: (...args: unknown[]) => mockUseMediaQuery(...args),
}));

function renderMainFooter() {
  return render(
    <I18nProvider>
      <MainFooter />
    </I18nProvider>,
  );
}

describe("MainFooter (UI)", () => {
  beforeEach(() => {
    mockUseMediaQuery.mockReturnValue(false);
    mockIsMobile = false;
    mockIsTablet = false;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows the app version", () => {
    renderMainFooter();
    expect(screen.getByRole("link", { name: "v 0.0.0-test" })).toBeInTheDocument();
  });

  it("renders help and about links", () => {
    renderMainFooter();
    expect(screen.getByRole("button", { name: "Help" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "About" })).toBeInTheDocument();
  });

  it("shows the web/tauri indicator", () => {
    renderMainFooter();
    expect(screen.getByText("App: Web")).toBeInTheDocument();
  });

  it("hides the desktop notice on desktop-like environments", () => {
    renderMainFooter();
    expect(screen.queryByRole("button", { name: "Desktop optimized" })).not.toBeInTheDocument();
  });

  it("shows the desktop notice when the device is mobile", async () => {
    mockIsMobile = true;
    renderMainFooter();
    expect(screen.getByRole("button", { name: "Desktop optimized" })).toBeInTheDocument();
  });

  it("shows the desktop notice when the device is tablet", () => {
    mockIsTablet = true;
    renderMainFooter();
    expect(screen.getByRole("button", { name: "Desktop optimized" })).toBeInTheDocument();
  });

  it("shows the desktop notice when the viewport is narrow", () => {
    mockUseMediaQuery.mockReturnValue(true);
    renderMainFooter();
    expect(screen.getByRole("button", { name: "Desktop optimized" })).toBeInTheDocument();
  });

  it("opens and closes the desktop compatibility modal", () => {
    mockIsMobile = true;
    renderMainFooter();

    fireEvent.click(screen.getByRole("button", { name: "Desktop optimized" }));
    expect(screen.getByRole("heading", { name: "Desktop browser recommended" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "HeroQuest Card Creator is currently optimized for desktop browsers.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(
      screen.queryByRole("heading", { name: "Desktop browser recommended" }),
    ).not.toBeInTheDocument();
  });
});
