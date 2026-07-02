import { act, renderHook } from "@testing-library/react";

import { apiClient } from "@/api/client";
import { useAssetImageUrl } from "@/hooks/useAssetImageUrl";

jest.mock("@/api/client", () => ({
  apiClient: {
    getAssetObjectUrl: jest.fn(),
  },
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("useAssetImageUrl", () => {
  const originalRevokeDescriptor = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
  const OriginalImage = global.Image;
  let revokeSpy: jest.Mock;
  let imageWidth = 320;
  let imageHeight = 160;

  beforeAll(() => {
    revokeSpy = jest.fn();
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: (...args: unknown[]) => revokeSpy(...args),
    });
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = imageWidth;
      naturalHeight = imageHeight;

      set src(_value: string) {
        this.naturalWidth = imageWidth;
        this.naturalHeight = imageHeight;
        queueMicrotask(() => {
          this.onload?.();
        });
      }
    }
    // @ts-expect-error test shim
    global.Image = MockImage;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    revokeSpy.mockReset();
    imageWidth = 320;
    imageHeight = 160;
  });

  afterAll(() => {
    global.Image = OriginalImage;
    if (originalRevokeDescriptor) {
      Object.defineProperty(URL, "revokeObjectURL", originalRevokeDescriptor);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (URL as any).revokeObjectURL;
    }
  });

  it("returns null and does not fetch when assetId is missing", () => {
    const { result } = renderHook(() => useAssetImageUrl(undefined));
    expect(result.current).toEqual({ url: null, status: "idle", width: null, height: null });
    expect(apiClient.getAssetObjectUrl).not.toHaveBeenCalled();
  });

  it("loads an object URL for an asset id and revokes it on unmount", async () => {
    (apiClient.getAssetObjectUrl as jest.Mock).mockResolvedValueOnce("blob:asset-1");

    const { result, unmount } = renderHook(() => useAssetImageUrl("asset-1"));
    expect(result.current).toEqual({ url: null, status: "loading", width: null, height: null });

    await flushMicrotasks();
    await flushMicrotasks();
    expect(result.current).toEqual({ url: "blob:asset-1", status: "ready", width: 320, height: 160 });
    expect(apiClient.getAssetObjectUrl).toHaveBeenCalledWith({
      params: { id: "asset-1" },
    });

    unmount();
    expect(revokeSpy).toHaveBeenCalledWith("blob:asset-1");
  });

  it("revokes the URL when the request resolves after being cancelled", async () => {
    const deferred = createDeferred<string | null>();
    (apiClient.getAssetObjectUrl as jest.Mock).mockReturnValueOnce(deferred.promise);

    const { result, rerender } = renderHook<ReturnType<typeof useAssetImageUrl>, { assetId?: string }>(
      ({ assetId }: { assetId?: string }) => {
        return useAssetImageUrl(assetId);
      },
      { initialProps: { assetId: "asset-1" } },
    );

    expect(result.current).toEqual({ url: null, status: "loading", width: null, height: null });

    // Cancel the in-flight request by clearing the asset id.
    rerender({ assetId: undefined });

    deferred.resolve("blob:late-url");
    await flushMicrotasks();

    expect(result.current).toEqual({ url: null, status: "idle", width: null, height: null });
    expect(revokeSpy).toHaveBeenCalledWith("blob:late-url");
  });

  it("returns null when getAssetObjectUrl throws", async () => {
    (apiClient.getAssetObjectUrl as jest.Mock).mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useAssetImageUrl("asset-1"));
    expect(result.current).toEqual({ url: null, status: "loading", width: null, height: null });

    await flushMicrotasks();
    expect(result.current).toEqual({ url: null, status: "missing", width: null, height: null });
  });
});
