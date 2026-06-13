import { act, renderHook } from "@testing-library/react";

import useBufferedLoadingIndicator from "@/hooks/useBufferedLoadingIndicator";

describe("useBufferedLoadingIndicator", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does not show the indicator if loading ends before the show delay", () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useBufferedLoadingIndicator(loading),
      { initialProps: { loading: true } },
    );

    act(() => {
      jest.advanceTimersByTime(149);
    });
    expect(result.current).toBe(false);

    rerender({ loading: false });

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(result.current).toBe(false);
  });

  it("shows the indicator once loading exceeds the show delay", () => {
    const { result } = renderHook(() => useBufferedLoadingIndicator(true));

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(result.current).toBe(true);
  });

  it("keeps the indicator visible for the minimum duration once shown", () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useBufferedLoadingIndicator(loading),
      { initialProps: { loading: true } },
    );

    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(result.current).toBe(true);

    rerender({ loading: false });

    act(() => {
      jest.advanceTimersByTime(399);
    });
    expect(result.current).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });

  it("stays visible until loading actually ends if loading outlasts the minimum duration", () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useBufferedLoadingIndicator(loading),
      { initialProps: { loading: true } },
    );

    act(() => {
      jest.advanceTimersByTime(550);
    });
    expect(result.current).toBe(true);

    rerender({ loading: false });
    expect(result.current).toBe(false);
  });
});
