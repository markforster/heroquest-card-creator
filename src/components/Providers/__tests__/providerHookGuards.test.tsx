import { renderHook } from "@testing-library/react";

import { useAppActions } from "@/components/Providers/AppActionsContext";
import { useAssetHashIndexContext } from "@/components/Providers/AssetHashIndexProvider";
import { useAssetKindQueue } from "@/components/Providers/AssetKindBackfillProvider";
import { useMissingAssets } from "@/components/Providers/MissingAssetsContext";

describe("provider hook guards", () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it.each([
    ["useAppActions", useAppActions, "useAppActions must be used within AppActionsProvider"],
    [
      "useAssetHashIndexContext",
      useAssetHashIndexContext,
      "useAssetHashIndexContext must be used within AssetHashIndexProvider",
    ],
    ["useAssetKindQueue", useAssetKindQueue, "useAssetKindQueue must be used within"],
    ["useMissingAssets", useMissingAssets, "useMissingAssets must be used within"],
  ])("guards %s outside its provider", (_name, hook, message) => {
    expect(() => renderHook(() => hook())).toThrow(message);
  });
});
