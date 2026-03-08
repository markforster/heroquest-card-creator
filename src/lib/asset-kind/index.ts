import { heuristicStrategy } from "./heuristic";

import type { AssetKindInput, AssetKindResult } from "./types";

const activeStrategy = heuristicStrategy;

export async function classifyAssetKind(input: AssetKindInput): Promise<AssetKindResult> {
  return activeStrategy(input);
}
