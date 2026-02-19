import { collectCardAssetIds } from "@/lib/card-assets";

describe("collectCardAssetIds", () => {
  it("returns empty array when card data is missing", () => {
    expect(collectCardAssetIds()).toEqual([]);
    expect(collectCardAssetIds(null)).toEqual([]);
  });

  it("includes imageAssetId when present", () => {
    expect(
      collectCardAssetIds({
        imageAssetId: "image-1",
      }),
    ).toEqual(["image-1"]);
  });

  it("includes iconAssetId when present", () => {
    expect(
      collectCardAssetIds({
        iconAssetId: "icon-1",
      }),
    ).toEqual(["icon-1"]);
  });

  it("filters falsy ids and keeps order", () => {
    expect(
      collectCardAssetIds({
        imageAssetId: "",
        iconAssetId: "icon-2",
      }),
    ).toEqual(["icon-2"]);
  });
});
