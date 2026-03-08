import { prepareAssetKindInput } from "./prepare";

import { classifyAssetKind } from "./index";

import type { AssetKindResult } from "./types";

export async function classifyAssetBlob(
  blob: Blob,
  originalDimensions?: { width: number; height: number },
): Promise<AssetKindResult> {
  const input = await prepareAssetKindInput(blob, originalDimensions);
  return classifyAssetKind(input);
}
