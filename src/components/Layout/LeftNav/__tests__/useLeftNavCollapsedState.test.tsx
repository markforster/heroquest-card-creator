import { act, renderHook, waitFor } from "@testing-library/react";

import { useLeftNavCollapsedState } from "@/components/Layout/LeftNav/useLeftNavCollapsedState";

describe("useLeftNavCollapsedState", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it("hydrates and persists the manual collapse preference", async () => {
    window.localStorage.setItem("nav-key", "true");
    const { result } = renderHook(() => useLeftNavCollapsedState("nav-key"));

    await waitFor(() => expect(result.current.isCollapsedReady).toBe(true));
    expect(result.current.manualCollapsed).toBe(true);

    act(() => result.current.setManualCollapsed(false));
    expect(window.localStorage.getItem("nav-key")).toBe("false");
  });

  it("becomes ready and tolerates storage failures", async () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    const { result } = renderHook(() => useLeftNavCollapsedState("nav-key"));
    await waitFor(() => expect(result.current.isCollapsedReady).toBe(true));
    expect(result.current.manualCollapsed).toBe(false);
  });
});
