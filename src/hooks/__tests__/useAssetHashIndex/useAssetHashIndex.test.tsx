import { renderHook } from "@testing-library/react";

import { useAssetHashIndex } from "@/hooks/useAssetHashIndex";

import { useAssetHashIndexContext } from "@/components/Assets/AssetHashIndexProvider";

jest.mock("@/components/Assets/AssetHashIndexProvider", () => ({
  useAssetHashIndexContext: jest.fn(),
}));

describe("useAssetHashIndex", () => {
  it("returns the AssetHashIndex context", () => {
    const sentinel = { status: "ready" } as const;
    (useAssetHashIndexContext as jest.Mock).mockReturnValueOnce(sentinel);

    const { result } = renderHook(() => useAssetHashIndex());

    expect(useAssetHashIndexContext).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(sentinel);
  });
});

