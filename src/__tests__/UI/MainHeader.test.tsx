import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import MainHeader from "@/components/Layout/MainHeader";
import { LibraryTransferProvider } from "@/components/Providers/LibraryTransferContext";
import { LocalStorageProvider } from "@/components/Providers/LocalStorageProvider";
import { I18nProvider } from "@/i18n/I18nProvider";

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
  __esModule: true,
  useAnalytics: () => ({
    track: jest.fn(),
  }),
}));

describe("MainHeader", () => {
  const renderHeader = () => {
    const queryClient = new QueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <LocalStorageProvider>
            <LibraryTransferProvider>
              <MainHeader />
            </LibraryTransferProvider>
          </LocalStorageProvider>
        </I18nProvider>
      </QueryClientProvider>,
    );
  };

  it("renders the brand and rate CTA", () => {
    renderHeader();

    expect(screen.getByRole("img", { name: "HeroQuest Card Creator" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Rate on itch\.io/i })).toHaveAttribute(
      "href",
      "https://mark-forster.itch.io/heroquest-card-creator/rate?source=in-app&popup=1",
    );
  });

  it("renders the current social links", () => {
    renderHeader();

    const socialLinks = screen.getByLabelText("Social links");
    expect(within(socialLinks).getByRole("link", { name: "Twitter" })).toHaveAttribute(
      "href",
      "https://x.com/hqcardcreator",
    );
    expect(within(socialLinks).getByRole("link", { name: "Discord" })).toHaveAttribute(
      "href",
      "https://discord.gg/gkVPyRjJ95",
    );
  });

  it("renders YouTube after Facebook in social links", () => {
    renderHeader();

    const socialLinks = screen.getByLabelText("Social links");
    const links = Array.from(socialLinks.querySelectorAll("a"));
    const labels = links.map((link) => link.getAttribute("aria-label"));

    expect(labels).toContain("YouTube");
    expect(labels.indexOf("YouTube")).toBe(labels.indexOf("Facebook") + 1);

    const youtubeLink = links.find((link) => link.getAttribute("aria-label") === "YouTube");
    expect(youtubeLink).toHaveAttribute("href", "https://www.youtube.com/@HeroQuestCardCreator");
  });
});
