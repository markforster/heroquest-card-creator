"use client";

import { useAssetHashIndexContext } from "@/components/Providers/AssetHashIndexProvider";

export function useAssetHashIndex() {
  return useAssetHashIndexContext();
}
