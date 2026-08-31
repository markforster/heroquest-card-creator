const getPaletteGroups = jest.fn();

jest.mock("@/lib/palette", () => ({
  getPaletteGroups: (...args: unknown[]) => getPaletteGroups(...args),
}));

import { act, renderHook } from "@testing-library/react";

import { useSmartSwatches } from "@/hooks/useSmartSwatches";

describe("useSmartSwatches", () => {
  beforeEach(() => getPaletteGroups.mockReset());

  it("renders a preview and stores generated palette groups", async () => {
    const canvas = document.createElement("canvas");
    const renderPreviewCanvas = jest.fn().mockResolvedValue(canvas);
    const groups = [{ id: "dominant", colors: ["#112233"] }];
    getPaletteGroups.mockResolvedValue(groups);
    const { result } = renderHook(() =>
      useSmartSwatches({ renderPreviewCanvas, width: 100, height: 200 }),
    );

    await act(() => result.current.requestSmart());

    expect(renderPreviewCanvas).toHaveBeenCalledWith({ width: 100, height: 200 });
    expect(getPaletteGroups).toHaveBeenCalledWith(canvas, { width: 100, height: 200 });
    expect(result.current.smartGroups).toEqual(groups);
    expect(result.current.isSmartBusy).toBe(false);
  });

  it("clears groups after a failed request and handles a missing canvas", async () => {
    const renderPreviewCanvas = jest
      .fn()
      .mockRejectedValueOnce(new Error("render failed"))
      .mockResolvedValueOnce(null);
    const { result } = renderHook(() =>
      useSmartSwatches({ renderPreviewCanvas, width: 1, height: 1 }),
    );

    await act(() => result.current.requestSmart());
    await act(() => result.current.requestSmart());
    expect(result.current.smartGroups).toEqual([]);
    expect(result.current.isSmartBusy).toBe(false);
  });
});
