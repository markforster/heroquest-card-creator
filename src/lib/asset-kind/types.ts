export type AssetKind = "icon" | "artwork" | "unknown";

export type AssetKindInput = {
  imageData: ImageData | Uint8ClampedArray;
  width: number;
  height: number;
  originalWidth?: number;
  originalHeight?: number;
};

export type AssetKindResult = {
  kind: AssetKind;
  confidence: number;
  source: "heuristic" | "ml";
};

export type AssetKindStrategy = (input: AssetKindInput) => Promise<AssetKindResult>;
