"use client";

import { useAssetHashIndexContext } from "@/components/Assets/AssetHashIndexProvider";

export function useAssetHashIndex() {
  return useAssetHashIndexContext();
}
