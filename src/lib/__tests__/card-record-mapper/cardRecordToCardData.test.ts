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

  it("defaults bodyTextFitToBounds to false for older records and preserves explicit true", () => {
    const legacyRecord: CardRecord & { templateId: "hero" } = {
      id: "card-3",
      templateId: "hero",
      status: "saved",
      name: "Legacy Hero Body Fit",
      nameLower: "legacy hero body fit",
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    };
    const explicitRecord: CardRecord & { templateId: "hero" } = {
      ...legacyRecord,
      id: "card-4",
      bodyTextFitToBounds: true,
    };

    expect(cardRecordToCardData(legacyRecord).bodyTextFitToBounds).toBe(false);
    expect(cardRecordToCardData(explicitRecord).bodyTextFitToBounds).toBe(true);
  });

  it("maps persisted name into editor form data", () => {
    const record: CardRecord & { templateId: "labelled-back" } = {
      id: "card-5",
      templateId: "labelled-back",
      status: "saved",
      name: "Treasure Deck",
      nameLower: "treasure deck",
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 2,
    };

    expect(cardRecordToCardData(record).name).toBe("Treasure Deck");
  });

  it("maps persisted Rules fields into editor form data", () => {
    const record: CardRecord & { templateId: "rules" } = {
      id: "rules-1",
      templateId: "rules",
      status: "saved",
      name: "Turn Summary",
      nameLower: "turn summary",
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 2,
      face: "front",
      description: "**Movement**\nMove around the board.",
      bodyTextColor: "#22170f",
      bodyTextFitToBounds: true,
    };

    expect(cardRecordToCardData(record)).toEqual(
      expect.objectContaining({
        name: "Turn Summary",
        face: "front",
        description: "**Movement**\nMove around the board.",
        bodyTextColor: "#22170f",
        bodyTextFitToBounds: true,
      }),
    );
  });

  it("maps persisted logo selection into Logo Back editor data", () => {
    const record: CardRecord & { templateId: "logo-back" } = {
      id: "logo-back-1",
      templateId: "logo-back",
      status: "saved",
      name: "Rules Logo",
      nameLower: "rules logo",
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 2,
      heroBackLogoMode: "custom",
      heroBackLogoId: "logo-1",
      heroBackLogoName: "Custom Logo",
      heroBackLogoOriginalWidth: 600,
      heroBackLogoOriginalHeight: 200,
    };

    expect(cardRecordToCardData(record)).toEqual(
      expect.objectContaining({
        heroBackLogoMode: "custom",
        heroBackLogoId: "logo-1",
        heroBackLogoName: "Custom Logo",
        heroBackLogoOriginalWidth: 600,
        heroBackLogoOriginalHeight: 200,
      }),
    );
  });
});
