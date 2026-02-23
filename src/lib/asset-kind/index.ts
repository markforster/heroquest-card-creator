import type { AssetKindInput, AssetKindResult } from "./types";
import { heuristicStrategy } from "./heuristic";

const activeStrategy = heuristicStrategy;

export async function classifyAssetKind(input: AssetKindInput): Promise<AssetKindResult> {
  return activeStrategy(input);
}
