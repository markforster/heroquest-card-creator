import { render, screen } from "@testing-library/react";

import MainHeader from "@/components/Layout/MainHeader";
import { I18nProvider } from "@/i18n/I18nProvider";

const mockUseUpdateNotice = jest.fn();

jest.mock("next/image", () => ({
  __esModule: true,
  default: function NextImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    // next/image accepts props that don't exist on a native <img> (e.g. `priority`).
    // Drop unknown props to avoid React "non-boolean attribute" warnings in tests.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { priority, ...rest } = props as React.ImgHTMLAttributes<HTMLImageElement> & {
      priority?: boolean;
    };
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />;
  },
}));

jest.mock("@/components/Providers/AnalyticsProvider", () => ({
  useAnalytics: () => ({
    track: jest.fn(),
  }),
}));

jest.mock("@/components/Providers/UpdateNoticeProvider", () => ({
  useUpdateNotice: () => mockUseUpdateNotice(),
}));

jest.mock("@/components/Providers/LibraryTransferContext", () => ({
  LibraryTransferProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/components/Layout/RateCta", () => ({
  __esModule: true,
  default: () => <div>Rate on itch.io</div>,
}));

describe("MainHeader", () => {
  beforeEach(() => {
    mockUseUpdateNotice.mockReturnValue({
      distribution: "unknown",
      isOnline: true,
      isChecking: false,
      isUpdateAvailable: false,
      latestVersion: null,
      source: null,
      error: null,
    });
  });

  function renderMainHeader() {
    return render(
      <I18nProvider>
        <MainHeader />
      </I18nProvider>,
    );
  }

  it("renders the application branding", () => {
    renderMainHeader();

    expect(screen.getByText("HeroQuest Card Creator")).toBeInTheDocument();
  });

  it("renders the rate CTA in the header center", () => {
    renderMainHeader();

    expect(screen.getByText("Rate on itch.io")).toBeInTheDocument();
  });

  it("renders YouTube after Facebook in social links", () => {
    renderMainHeader();

    const socialLinks = screen.getByLabelText("Social links");
    const links = Array.from(socialLinks.querySelectorAll("a"));
    const labels = links.map((link) => link.getAttribute("aria-label"));

    expect(labels).toContain("YouTube");
    expect(labels.indexOf("YouTube")).toBe(labels.indexOf("Facebook") + 1);

    const youtubeLink = links.find((link) => link.getAttribute("aria-label") === "YouTube");
    expect(youtubeLink).toHaveAttribute("href", "https://www.youtube.com/@HeroQuestCardCreator");
  });

  it("renders the update notice in the right-side header actions", () => {
    mockUseUpdateNotice.mockReturnValue({
      distribution: "download",
      isOnline: true,
      isChecking: false,
      isUpdateAvailable: true,
      latestVersion: "0.6.0",
      source: "github",
      error: null,
    });

    renderMainHeader();

    expect(screen.getByText("A new version is available: 0.6.0.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download on itch.io" })).toBeInTheDocument();
    expect(screen.getByLabelText("Social links")).toBeInTheDocument();
  });

  it("does not render the update notice when offline", () => {
    mockUseUpdateNotice.mockReturnValue({
      distribution: "download",
      isOnline: false,
      isChecking: false,
      isUpdateAvailable: true,
      latestVersion: "0.6.0",
      source: "github",
      error: null,
    });

    renderMainHeader();

    expect(screen.getByText("A new version is available: 0.6.0.")).toBeInTheDocument();
  });

  it("does not render the update notice when offline and no confirmed update exists", () => {
    mockUseUpdateNotice.mockReturnValue({
      distribution: "download",
      isOnline: false,
      isChecking: false,
      isUpdateAvailable: false,
      latestVersion: null,
      source: null,
      error: null,
    });

    renderMainHeader();

    expect(screen.queryByText(/A new version is available:/)).not.toBeInTheDocument();
  });
});
