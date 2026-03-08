import { renderHook } from "@testing-library/react";

import { useAssetHashIndexContext } from "@/components/Providers/AssetHashIndexProvider";
import { useAssetHashIndex } from "@/hooks/useAssetHashIndex";


jest.mock("@/components/Providers/AssetHashIndexProvider", () => ({
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

