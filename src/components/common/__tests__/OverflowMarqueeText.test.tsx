import { act, fireEvent, render, screen } from "@testing-library/react";

import OverflowMarqueeText from "@/components/common/OverflowMarqueeText";

function setElementWidth(element: Element, width: number) {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () =>
      ({
        width,
        height: 16,
        top: 0,
        left: 0,
        right: width,
        bottom: 16,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect,
  });
}

describe("OverflowMarqueeText", () => {
  const originalMatchMedia = window.matchMedia;
  const originalResizeObserver = global.ResizeObserver;

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      disconnect() {}
      unobserve() {}
    } as typeof ResizeObserver;
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
    global.ResizeObserver = originalResizeObserver;
  });

  function configureMeasurements(text: string, viewportWidth: number, textWidth: number) {
    const track = screen.getByText(text);
    const viewport = track.parentElement as HTMLElement;
    setElementWidth(viewport, viewportWidth);
    setElementWidth(track, textWidth);
    Object.defineProperty(track, "scrollWidth", {
      configurable: true,
      value: textWidth,
    });
    return {
      root: track.closest("[data-overflowing]") as HTMLElement,
      track: track as HTMLElement,
    };
  }

  it("stays static when the text does not overflow", () => {
    render(<OverflowMarqueeText text="Short label" />);
    const { root, track } = configureMeasurements("Short label", 140, 80);

    fireEvent.mouseEnter(root);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(root.dataset.overflowing).toBe("false");
    expect(root.dataset.marqueeActive).toBe("false");
    expect(track).toHaveStyle({ transform: "translate3d(0px, 0, 0)" });
  });

  it("animates overflowing text after a short delay and resets on mouse leave", () => {
    render(<OverflowMarqueeText text="A very long saved card title" />);
    const { root, track } = configureMeasurements("A very long saved card title", 100, 180);

    fireEvent.mouseEnter(root);

    expect(root.dataset.overflowing).toBe("true");
    expect(track).toHaveStyle({ transform: "translate3d(0px, 0, 0)" });

    act(() => {
      jest.advanceTimersByTime(650);
    });

    expect(root.dataset.marqueeActive).toBe("true");
    expect(track).toHaveStyle({ transform: "translate3d(-80px, 0, 0)" });

    fireEvent.mouseLeave(root);

    expect(root.dataset.marqueeActive).toBe("false");
    expect(track).toHaveStyle({ transform: "translate3d(0px, 0, 0)" });
  });

  it("snaps back immediately when hover ends during the return scroll", () => {
    render(<OverflowMarqueeText text="A very long saved card title" />);
    const { root, track } = configureMeasurements("A very long saved card title", 100, 180);

    fireEvent.mouseEnter(root);

    act(() => {
      jest.advanceTimersByTime(4100);
    });

    expect(root.dataset.marqueeActive).toBe("true");
    expect(track).toHaveStyle({ transform: "translate3d(0px, 0, 0)" });
    expect(track).toHaveStyle({ transitionProperty: "transform" });

    fireEvent.mouseLeave(root);

    expect(root.dataset.marqueeActive).toBe("false");
    expect(track).toHaveStyle({ transform: "translate3d(0px, 0, 0)" });
    expect(track).toHaveStyle({ transitionProperty: "none" });
  });

  it("disables marquee motion when reduced motion is preferred", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    render(<OverflowMarqueeText text="Another very long saved card title" />);
    const { root, track } = configureMeasurements("Another very long saved card title", 90, 190);

    fireEvent.mouseEnter(root);

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(root.dataset.overflowing).toBe("true");
    expect(root.dataset.marqueeActive).toBe("false");
    expect(track).toHaveStyle({ transform: "translate3d(0px, 0, 0)" });
  });

  it("supports controlled activation so text stays truncated until the parent activates it", () => {
    const { rerender } = render(<OverflowMarqueeText text="Controlled marquee label" active={false} />);
    let measurements = configureMeasurements("Controlled marquee label", 90, 190);

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(measurements.root.dataset.marqueeActive).toBe("false");
    expect(measurements.track).toHaveStyle({ transform: "translate3d(0px, 0, 0)" });

    rerender(<OverflowMarqueeText text="Controlled marquee label" active />);
    measurements = configureMeasurements("Controlled marquee label", 90, 190);

    act(() => {
      jest.advanceTimersByTime(650);
    });

    expect(measurements.root.dataset.marqueeActive).toBe("true");
    expect(measurements.track).toHaveStyle({ transform: "translate3d(-100px, 0, 0)" });
  });
});
