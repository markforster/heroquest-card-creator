const getHeroBackLogoObjectUrl = jest.fn();

jest.mock("@/api/heroBackLogos/client", () => ({
  getHeroBackLogoObjectUrl: (...args: unknown[]) => getHeroBackLogoObjectUrl(...args),
}));

import { renderHook, waitFor } from "@testing-library/react";

import { useHeroBackLogoImageUrl } from "@/hooks/useHeroBackLogoImageUrl";

describe("useHeroBackLogoImageUrl", () => {
  beforeEach(() => {
    getHeroBackLogoObjectUrl.mockReset();
    jest.restoreAllMocks();
  });

  it("remains idle without a logo identifier", () => {
    expect(renderHook(() => useHeroBackLogoImageUrl()).result.current).toEqual({
      url: null,
      status: "idle",
      width: null,
      height: null,
    });
  });

  it("loads an object URL, image dimensions, and revokes it on unmount", async () => {
    getHeroBackLogoObjectUrl.mockResolvedValue("blob:logo");
    const revokeObjectURL = jest.fn();
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    class TestImage {
      naturalWidth = 320;
      naturalHeight = 180;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    Object.defineProperty(globalThis, "Image", { configurable: true, value: TestImage });
    const { result, unmount } = renderHook(() => useHeroBackLogoImageUrl("logo-1"));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toEqual({
      url: "blob:logo",
      status: "ready",
      width: 320,
      height: 180,
    });
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:logo");
  });

  it("reports missing when no URL is available or loading fails", async () => {
    getHeroBackLogoObjectUrl.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("failed"));
    const first = renderHook(() => useHeroBackLogoImageUrl("missing"));
    await waitFor(() => expect(first.result.current.status).toBe("missing"));
    first.unmount();

    const second = renderHook(() => useHeroBackLogoImageUrl("failed"));
    await waitFor(() => expect(second.result.current.status).toBe("missing"));
  });
});
