import { cardRecordToCardData } from "@/lib/card-record-mapper";
import { computeContainScale, getImageLayerBounds } from "@/lib/image-scale";
import type { CardRecord } from "@/types/cards-db";

describe("cardRecordToCardData", () => {
  it("normalizes legacy imageScale values to relative mode without changing effective scale", () => {
    const record: CardRecord & { templateId: "hero" } = {
      id: "card-1",
      templateId: "hero",
      status: "saved",
      name: "Legacy Hero",
      nameLower: "legacy hero",
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
      imageAssetId: "asset-1",
      imageAssetName: "Legacy Art",
      imageScale: 3,
      imageOriginalWidth: 1000,
      imageOriginalHeight: 1000,
    };

    const data = cardRecordToCardData(record);
    const bounds = getImageLayerBounds("hero", "imageAssetId");
    const containScale = computeContainScale(bounds, record.imageOriginalWidth, record.imageOriginalHeight);

    expect(data.imageScaleMode).toBe("relative");
    expect(data.imageScale).toBeCloseTo((record.imageScale ?? 1) / containScale, 6);
    expect((data.imageScale ?? 1) * containScale).toBeCloseTo(record.imageScale ?? 1, 6);
  });

  it("defers legacy normalization when original image dimensions are missing", () => {
    const record: CardRecord & { templateId: "hero" } = {
      id: "card-2",
      templateId: "hero",
      status: "saved",
      name: "Legacy Hero Missing Dims",
      nameLower: "legacy hero missing dims",
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
      imageAssetId: "asset-2",
      imageAssetName: "Legacy Art",
      imageScale: 2.5,
    };

    const data = cardRecordToCardData(record);
    expect(data.imageScaleMode).toBe("absolute");
    expect(data.imageScale).toBe(2.5);
  });
});
