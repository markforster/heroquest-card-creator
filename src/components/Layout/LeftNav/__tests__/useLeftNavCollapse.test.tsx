const useMediaQuery = jest.fn();
const useLeftNavCollapsedState = jest.fn();

jest.mock("@/components/Layout/LeftNav/useMediaQuery", () => ({
  useMediaQuery: (...args: unknown[]) => useMediaQuery(...args),
}));
jest.mock("@/components/Layout/LeftNav/useLeftNavCollapsedState", () => ({
  useLeftNavCollapsedState: (...args: unknown[]) => useLeftNavCollapsedState(...args),
}));

import { renderHook } from "@testing-library/react";

import { useLeftNavCollapse } from "@/components/Layout/LeftNav/useLeftNavCollapse";

describe("useLeftNavCollapse", () => {
  it.each([
    [false, false, false],
    [true, false, true],
    [false, true, true],
  ])("combines automatic %s and manual %s collapse as %s", (automatic, manual, expected) => {
    const setManualCollapsed = jest.fn();
    useMediaQuery.mockReturnValue(automatic);
    useLeftNavCollapsedState.mockReturnValue({
      manualCollapsed: manual,
      setManualCollapsed,
      isCollapsedReady: true,
    });

    expect(renderHook(() => useLeftNavCollapse()).result.current).toEqual({
      isCollapsed: expected,
      setManualCollapsed,
      isCollapsedReady: true,
    });
  });
});
