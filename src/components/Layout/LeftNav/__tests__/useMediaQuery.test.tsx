import { act, renderHook } from "@testing-library/react";

import { useMediaQuery } from "@/components/Layout/LeftNav/useMediaQuery";

describe("useMediaQuery", () => {
  it("tracks media query changes and removes its listener on unmount", () => {
    let changeListener: ((event: MediaQueryListEvent) => void) | undefined;
    const removeEventListener = jest.fn();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: jest.fn(() => ({
        matches: true,
        addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
          changeListener = listener;
        },
        removeEventListener,
      })),
    });

    const { result, unmount } = renderHook(() => useMediaQuery("(max-width: 10px)"));
    expect(result.current).toBe(true);

    act(() => changeListener?.({ matches: false } as MediaQueryListEvent));
    expect(result.current).toBe(false);

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith("change", changeListener);
  });

  it("returns false when matchMedia is unavailable", () => {
    Object.defineProperty(window, "matchMedia", { configurable: true, value: undefined });
    expect(renderHook(() => useMediaQuery("all")).result.current).toBe(false);
  });
});
