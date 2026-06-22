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
  let revokeSpy: jest.Mock;

  beforeAll(() => {
    revokeSpy = jest.fn();
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: (...args: unknown[]) => revokeSpy(...args),
    });
  });

  beforeEach(() => {
    jest.resetAllMocks();
    revokeSpy.mockReset();
  });

  afterAll(() => {
    if (originalRevokeDescriptor) {
      Object.defineProperty(URL, "revokeObjectURL", originalRevokeDescriptor);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (URL as any).revokeObjectURL;
    }
  });

  it("returns null and does not fetch when assetId is missing", () => {
    const { result } = renderHook(() => useAssetImageUrl(undefined));
    expect(result.current).toEqual({ url: null, status: "idle" });
    expect(apiClient.getAssetObjectUrl).not.toHaveBeenCalled();
  });

  it("loads an object URL for an asset id and revokes it on unmount", async () => {
    (apiClient.getAssetObjectUrl as jest.Mock).mockResolvedValueOnce("blob:asset-1");

    const { result, unmount } = renderHook(() => useAssetImageUrl("asset-1"));
    expect(result.current).toEqual({ url: null, status: "loading" });

    await flushMicrotasks();
    expect(result.current).toEqual({ url: "blob:asset-1", status: "ready" });
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

    expect(result.current).toEqual({ url: null, status: "loading" });

    // Cancel the in-flight request by clearing the asset id.
    rerender({ assetId: undefined });

    deferred.resolve("blob:late-url");
    await flushMicrotasks();

    expect(result.current).toEqual({ url: null, status: "idle" });
    expect(revokeSpy).toHaveBeenCalledWith("blob:late-url");
  });

  it("returns null when getAssetObjectUrl throws", async () => {
    (apiClient.getAssetObjectUrl as jest.Mock).mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useAssetImageUrl("asset-1"));
    expect(result.current).toEqual({ url: null, status: "loading" });

    await flushMicrotasks();
    expect(result.current).toEqual({ url: null, status: "missing" });
  });
});
