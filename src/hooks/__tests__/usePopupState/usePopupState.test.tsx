import { act, renderHook } from "@testing-library/react";

import { usePopupState } from "@/hooks/usePopupState";

describe("usePopupState", () => {
  it("defaults to closed", () => {
    const { result } = renderHook(() => usePopupState());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isClosed).toBe(true);
  });

  it("can default to open", () => {
    const { result } = renderHook(() => usePopupState(true));
    expect(result.current.isOpen).toBe(true);
    expect(result.current.isClosed).toBe(false);
  });

  it("open() sets state to open", () => {
    const { result } = renderHook(() => usePopupState());
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
    expect(result.current.isClosed).toBe(false);
  });

  it("close() sets state to closed", () => {
    const { result } = renderHook(() => usePopupState(true));
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isClosed).toBe(true);
  });
});

