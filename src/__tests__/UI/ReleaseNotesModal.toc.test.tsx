import { fireEvent, render, screen, within } from "@testing-library/react";

import ReleaseNotesModal from "@/components/Modals/ReleaseNotesModal";
import { I18nProvider } from "@/i18n/I18nProvider";
import { APP_VERSION } from "@/version";

const expectedSections = [
  ["about-what-this-is", "What this is"],
  ["about-why-it-exists", "Why it exists"],
  ["about-what-you-can-do-today", "What you can do today"],
  ["about-notes-future-work", "Notes & future work"],
  ["about-credits-attribution", "Credits & Attribution"],
  ["about-update-v0-8-0", "Update 25/07/2026 (v0.8.0)"],
  ["about-update-v0-7-1", "Update 12/07/2026 (v0.7.1)"],
  ["about-update-v0-7-0", "Update 05/07/2026 (v0.7.0)"],
  ["about-update-v0-6-2", "Update 22/06/2026 (v0.6.2)"],
  ["about-update-v0-6-1", "Update 13/06/2026 (v0.6.1)"],
  ["about-update-v0-6-0", "Update 31/05/2026 (v0.6.0)"],
  ["about-update-v0-5-7", "Update 30/03/2026 (v0.5.7)"],
  ["about-update-v0-5-6", "Update 15/03/2026 (v0.5.6)"],
  ["about-update-v0-5-5", "Update 07/03/2026 (v0.5.5)"],
  ["about-update-v0-5-4", "Update 28/02/2026 (v0.5.4)"],
  ["about-update-v0-5-3-1", "Update 28/02/2026 (v0.5.3.1)"],
  ["about-update-v0-5-3", "Update 26/02/2026 (v0.5.3)"],
  ["about-update-v0-5-2", "Update 12/02/2026 (v0.5.2)"],
  ["about-update-v0-5-1", "Update 07/02/2026 (v0.5.1)"],
  ["about-update-v0-5-0", "Update 10/01/2026 (v0.5.0)"],
  ["about-update-v0-4-0", "Update 18/12/2025 (v0.4.0)"],
] as const;

const expectedLinks = [
  "https://actionfence.itch.io/hqcc",
  "https://public.markforster.info/Heroquest/cards/",
  "https://public.markforster.info/Heroquest/Tools/card-maker-sample-screenshots/",
  "https://www.onlinewebfonts.com/package/Carter_Sans",
  "https://www.onlinewebfonts.com/icon",
  "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.8.0",
  "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.7.1",
  "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.7.0",
  "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.6.2",
  "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.6.1",
  "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.6.0",
  "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.5.7",
  "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.5.6",
  "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.5.5",
  "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.5.4",
  "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.5.3.1",
  "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.5.3",
  "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.5.2",
  "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.5.1",
  "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.5.0",
] as const;

beforeEach(() => {
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    writable: true,
    value: jest.fn(),
  });
});

function renderModal() {
  return render(
    <I18nProvider>
      <ReleaseNotesModal isOpen onClose={() => undefined} />
    </I18nProvider>,
  );
}

describe("ReleaseNotesModal TOC", () => {
  it("renders the shared About document layout", () => {
    renderModal();

    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
    expect(
      screen.getByText(`Version ${APP_VERSION}. Project background, credits, and release history.`),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "About the card creator" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Learn what the app is, why it exists, what it can do, and how it has developed over time.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /On this page/i })).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", {
      name: "About and release notes contents",
    });
    expect(within(navigation).getAllByRole("button")).toHaveLength(expectedSections.length);
  });

  it("jumps every TOC entry to its section without URL hash changes", () => {
    renderModal();
    const beforeHash = window.location.hash;

    expectedSections.forEach(([, title]) => {
      fireEvent.click(screen.getByRole("button", { name: title }));
    });

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(expectedSections.length);
    expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(window.location.hash).toBe(beforeHash);
  });

  it("preserves every section, content element, and external destination", () => {
    renderModal();

    const sections = Array.from(document.querySelectorAll("article section"));
    expect(
      sections.map((section) => [section.id, section.querySelector("h3")?.textContent ?? ""]),
    ).toEqual(expectedSections);
    expect(document.querySelectorAll("article section p")).toHaveLength(55);
    expect(document.querySelectorAll("article section ul")).toHaveLength(15);
    expect(document.querySelectorAll("article section li")).toHaveLength(99);
    expect(
      Array.from(document.querySelectorAll<HTMLAnchorElement>("article section a[href]")).map(
        (link) => link.href,
      ),
    ).toEqual(expectedLinks);
  });

  it("renders the credits section with the font source link", () => {
    renderModal();

    expect(screen.getByRole("heading", { name: "Credits & Attribution" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "onlinewebfonts.com" })).toHaveAttribute(
      "href",
      "https://www.onlinewebfonts.com/package/Carter_Sans",
    );
  });

  it("renders the new 0.8.0, 0.7.1, 0.6.1 and 0.6.2 release summaries", () => {
    renderModal();

    expect(screen.getByRole("heading", { name: "Update 25/07/2026 (v0.8.0)" })).toBeInTheDocument();
    expect(
      screen.getByText(/New Rules and Logo Back templates, plus more authentic Rules parchment and layout tuning\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "v0.8.0" })).toHaveAttribute(
      "href",
      "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.8.0",
    );

    expect(screen.getByRole("heading", { name: "Update 12/07/2026 (v0.7.1)" })).toBeInTheDocument();
    expect(
      screen.getByText(/Saved reusable print\/export presets via Export Profiles\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "v0.7.1" })).toHaveAttribute(
      "href",
      "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.7.1",
    );

    expect(screen.getByRole("heading", { name: "Update 05/07/2026 (v0.7.0)" })).toBeInTheDocument();
    expect(
      screen.getByText(/Deck PDF export with printable A4 and Letter layouts\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "v0.7.0" })).toHaveAttribute(
      "href",
      "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.7.0",
    );

    expect(screen.getByRole("heading", { name: "Update 22/06/2026 (v0.6.2)" })).toBeInTheDocument();
    expect(
      screen.getByText(/New Scale To Fit option for body text and better stat-heading wrapping\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "v0.6.2" })).toHaveAttribute(
      "href",
      "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.6.2",
    );

    expect(screen.getByRole("heading", { name: "Update 13/06/2026 (v0.6.1)" })).toBeInTheDocument();
    expect(
      screen.getByText(/Zoomable asset preview and direct open-card-from-usage workflows\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "v0.6.1" })).toHaveAttribute(
      "href",
      "https://github.com/markforster/heroquest-card-creator/releases/tag/v0.6.1",
    );
  });
});
