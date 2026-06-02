import { act, fireEvent, render, screen } from "@testing-library/react";

import ReleaseNotesModal from "@/components/Modals/ReleaseNotesModal";
import { I18nProvider } from "@/i18n/I18nProvider";

type MockObserver = {
  callback: IntersectionObserverCallback;
  observe: jest.Mock;
  unobserve: jest.Mock;
  disconnect: jest.Mock;
};

const observers: MockObserver[] = [];

beforeEach(() => {
  observers.length = 0;

  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    value: jest.fn((callback: IntersectionObserverCallback) => {
      const instance: MockObserver = {
        callback,
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
      observers.push(instance);
      return instance;
    }),
  });

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
  it("renders TOC entries", () => {
    renderModal();

    expect(screen.getByRole("heading", { name: /On this page/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "What this is" }).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: "Credits & Attribution" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: "Update 31/05/2026 (v0.6.0)" }).length,
    ).toBeGreaterThan(0);
  });

  it("jumps to section on TOC click without URL hash changes", () => {
    renderModal();
    const beforeHash = window.location.hash;

    fireEvent.click(screen.getByRole("button", { name: "Update 31/05/2026 (v0.6.0)" }));

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(window.location.hash).toBe(beforeHash);
  });

  it("renders the credits section with the font source link", () => {
    renderModal();

    expect(screen.getByRole("heading", { name: "Credits & Attribution" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "onlinewebfonts.com" })).toHaveAttribute(
      "href",
      "https://www.onlinewebfonts.com/package/Carter_Sans",
    );
  });

  it("updates active TOC item from intersection observer", () => {
    renderModal();

    const updateSection = document.getElementById("about-update-v0-5-7");
    expect(updateSection).not.toBeNull();
    expect(observers.length).toBeGreaterThan(0);

    act(() => {
      observers[0].callback(
        [
          {
            target: updateSection as Element,
            isIntersecting: true,
            intersectionRatio: 0.8,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    });

    const activeButton = screen.getByRole("button", { name: "Update 30/03/2026 (v0.5.7)" });
    expect(activeButton.className).toContain("aboutTocButtonActive");
  });
});
