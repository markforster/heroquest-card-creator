const getBorderSwatches = jest.fn();
const setBorderSwatches = jest.fn();

jest.mock("@/api/client", () => ({
  apiClient: {
    getBorderSwatches: (...args: unknown[]) => getBorderSwatches(...args),
    setBorderSwatches: (...args: unknown[]) => setBorderSwatches(...args),
  },
}));

import { act, renderHook, waitFor } from "@testing-library/react";

import { useSharedColorSwatches } from "@/hooks/useSharedColorSwatches";

describe("useSharedColorSwatches", () => {
  beforeEach(() => {
    getBorderSwatches.mockReset().mockResolvedValue([" #112233 ", 42]);
    setBorderSwatches.mockReset().mockResolvedValue(undefined);
  });

  it("loads, adds, deduplicates, and removes normalized swatches", async () => {
    const { result } = renderHook(() => useSharedColorSwatches());
    await waitFor(() => expect(result.current.swatches).toEqual(["#112233"]));

    await act(() => result.current.saveSwatch("#abcdef"));
    expect(result.current.swatches).toEqual(["#112233", "#ABCDEF"]);
    expect(setBorderSwatches).toHaveBeenCalledWith({ swatches: ["#112233", "#ABCDEF"] });

    await act(() => result.current.saveSwatch("#abcdef"));
    await act(() => result.current.saveSwatch("transparent"));
    await act(() => result.current.saveSwatch("#310101"));
    expect(setBorderSwatches).toHaveBeenCalledTimes(1);

    await act(() => result.current.removeSwatch("#112233"));
    expect(result.current.swatches).toEqual(["#ABCDEF"]);
  });

  it("uses an empty list when loading fails", async () => {
    getBorderSwatches.mockRejectedValue(new Error("unavailable"));
    const { result } = renderHook(() => useSharedColorSwatches());
    await waitFor(() => expect(getBorderSwatches).toHaveBeenCalled());
    expect(result.current.swatches).toEqual([]);
  });
});
