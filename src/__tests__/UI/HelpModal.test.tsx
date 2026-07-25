import { act, fireEvent, render, screen } from "@testing-library/react";

import HelpModal from "@/components/Modals/HelpModal";
import {
  checkHelpSiteAvailability,
  HELP_SITE_URL,
} from "@/components/Modals/HelpModal/help-site-availability";
import { I18nProvider } from "@/i18n/I18nProvider";

jest.mock("@/components/Modals/HelpModal/help-site-availability", () => {
  const actual = jest.requireActual("@/components/Modals/HelpModal/help-site-availability");
  return {
    ...actual,
    checkHelpSiteAvailability: jest.fn(),
  };
});

const mockCheckHelpSiteAvailability = checkHelpSiteAvailability as jest.MockedFunction<
  typeof checkHelpSiteAvailability
>;

function setOnline(isOnline: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value: isOnline,
  });
}

function renderModal() {
  return render(
    <I18nProvider>
      <HelpModal isOpen onClose={() => undefined} />
    </I18nProvider>,
  );
}

describe("HelpModal", () => {
  beforeEach(() => {
    setOnline(true);
    mockCheckHelpSiteAvailability.mockReset();
  });

  it("shows the online help site when it is reachable", async () => {
    mockCheckHelpSiteAvailability.mockResolvedValue(true);
    renderModal();

    const frame = await screen.findByTitle("HeroQuest Card Creator online help");
    expect(frame).toHaveAttribute("src", HELP_SITE_URL);
    expect(screen.getByRole("link", { name: "Open in new tab" })).toHaveAttribute(
      "href",
      HELP_SITE_URL,
    );
    expect(screen.getByRole("button", { name: "Use built-in help" })).toBeInTheDocument();
  });

  it("uses bundled help immediately when the browser is offline", async () => {
    setOnline(false);
    renderModal();

    expect(
      await screen.findByText(/Online help is unavailable. You can still use the built-in guide/i),
    ).toBeInTheDocument();
    expect(mockCheckHelpSiteAvailability).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "PDF export" })).toBeInTheDocument();
    expect(
      screen.getByText(/Deck PDF export creates a print-ready PDF from a deck/i),
    ).toBeInTheDocument();
  });

  it("falls back to bundled help when the help site is unavailable", async () => {
    mockCheckHelpSiteAvailability.mockResolvedValue(false);
    renderModal();

    expect(
      await screen.findByText(/Online help is unavailable. You can still use the built-in guide/i),
    ).toBeInTheDocument();
    expect(screen.queryByTitle("HeroQuest Card Creator online help")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry online help" })).toBeInTheDocument();
  });

  it("retries the online help after a failed check", async () => {
    mockCheckHelpSiteAvailability.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderModal();

    fireEvent.click(await screen.findByRole("button", { name: "Retry online help" }));

    expect(await screen.findByTitle("HeroQuest Card Creator online help")).toBeInTheDocument();
    expect(mockCheckHelpSiteAvailability).toHaveBeenCalledTimes(2);
  });

  it("lets the user switch to bundled help while online", async () => {
    mockCheckHelpSiteAvailability.mockResolvedValue(true);
    renderModal();

    fireEvent.click(await screen.findByRole("button", { name: "Use built-in help" }));

    expect(screen.getByRole("heading", { name: "PDF export" })).toBeInTheDocument();
    expect(
      screen.getByText("Using the built-in guide. Online help remains available."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View online help" })).toBeInTheDocument();
  });

  it("scrolls to bundled sections without changing the app route", async () => {
    setOnline(false);
    renderModal();

    const section = (
      await screen.findByRole("heading", {
        name: "Text fitting and readability",
      })
    ).closest("section");
    if (!section) {
      throw new Error("Expected the Text fitting section to be rendered");
    }
    const scrollIntoView = jest.fn();
    Object.defineProperty(section, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    const routeBeforeClick = window.location.hash;

    fireEvent.click(screen.getByRole("button", { name: "Text fitting" }));

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(window.location.hash).toBe(routeBeforeClick);
  });

  it("switches an open online view to bundled help when the browser goes offline", async () => {
    mockCheckHelpSiteAvailability.mockResolvedValue(true);
    renderModal();
    expect(await screen.findByTitle("HeroQuest Card Creator online help")).toBeInTheDocument();

    setOnline(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.queryByTitle("HeroQuest Card Creator online help")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "PDF export" })).toBeInTheDocument();
  });

  it("checks again when the browser reconnects", async () => {
    setOnline(false);
    mockCheckHelpSiteAvailability.mockResolvedValue(true);
    renderModal();
    expect(await screen.findByRole("heading", { name: "PDF export" })).toBeInTheDocument();

    setOnline(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(await screen.findByTitle("HeroQuest Card Creator online help")).toBeInTheDocument();
    expect(mockCheckHelpSiteAvailability).toHaveBeenCalledTimes(1);
  });
});
