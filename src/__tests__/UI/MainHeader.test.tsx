import { fireEvent, render, screen } from "@testing-library/react";

import MainHeader from "@/components/Layout/MainHeader";
import { LibraryTransferProvider } from "@/components/Providers/LibraryTransferContext";
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

describe("MainHeader", () => {
  it("renders the library menu button", () => {
    render(
      <I18nProvider>
        <LibraryTransferProvider>
          <MainHeader />
        </LibraryTransferProvider>
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Library menu/i })).toBeInTheDocument();
  });

  it("opens the library menu with export/import actions", () => {
    render(
      <I18nProvider>
        <LibraryTransferProvider>
          <MainHeader />
        </LibraryTransferProvider>
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Library menu/i }));

    expect(screen.getByRole("menuitem", { name: /Export library/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Import library/i })).toBeInTheDocument();
  });

  it("renders YouTube after Facebook in social links", () => {
    render(
      <I18nProvider>
        <LibraryTransferProvider>
          <MainHeader />
        </LibraryTransferProvider>
      </I18nProvider>,
    );

    const socialLinks = screen.getByLabelText("Social links");
    const links = Array.from(socialLinks.querySelectorAll("a"));
    const labels = links.map((link) => link.getAttribute("aria-label"));

    expect(labels).toContain("YouTube");
    expect(labels.indexOf("YouTube")).toBe(labels.indexOf("Facebook") + 1);

    const youtubeLink = links.find((link) => link.getAttribute("aria-label") === "YouTube");
    expect(youtubeLink).toHaveAttribute("href", "https://www.youtube.com/@HeroQuestCardCreator");
  });
});
