const prepareAssetKindInput = jest.fn();
const classifyAssetKind = jest.fn();

jest.mock("@/lib/asset-kind/prepare", () => ({
  prepareAssetKindInput: (...args: unknown[]) => prepareAssetKindInput(...args),
}));
jest.mock("@/lib/asset-kind", () => ({
  classifyAssetKind: (...args: unknown[]) => classifyAssetKind(...args),
}));

import { classifyAssetBlob } from "@/lib/asset-kind/classify";

describe("classifyAssetBlob", () => {
  it("prepares the blob and delegates classification", async () => {
    const blob = new Blob(["image"]);
    const dimensions = { width: 640, height: 480 };
    const input = { width: 128, height: 128, imageData: new Uint8ClampedArray() };
    const result = { kind: "icon", confidence: 0.9, source: "heuristic" };
    prepareAssetKindInput.mockResolvedValue(input);
    classifyAssetKind.mockResolvedValue(result);

    await expect(classifyAssetBlob(blob, dimensions)).resolves.toBe(result);
    expect(prepareAssetKindInput).toHaveBeenCalledWith(blob, dimensions);
    expect(classifyAssetKind).toHaveBeenCalledWith(input);
  });
});
