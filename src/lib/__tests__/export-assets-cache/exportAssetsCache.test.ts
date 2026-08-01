const getAssetBlob = jest.fn();
const getHeroBackLogoBlob = jest.fn();

jest.mock("@/api/client", () => ({
  apiClient: { getAssetBlob: (...args: unknown[]) => getAssetBlob(...args) },
}));

jest.mock("@/lib/data/hero-back-logos-db", () => ({
  getHeroBackLogoBlob: (...args: unknown[]) => getHeroBackLogoBlob(...args),
}));

import {
  buildAssetCache,
  buildHeroBackLogoCache,
  buildMissingAssetsReport,
  collectAssetIdsFromCard,
  collectHeroBackLogoIdsFromCard,
} from "@/lib/export-assets-cache";
import type { CardRecord } from "@/types/cards-db";

function createCard(overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: "card-1",
    templateId: "hero",
    status: "saved",
    name: "Hero",
    nameLower: "hero",
    createdAt: 1,
    updatedAt: 1,
    schemaVersion: 2,
    ...overrides,
  };
}

describe("export asset caches", () => {
  beforeEach(() => {
    getAssetBlob.mockReset();
    getHeroBackLogoBlob.mockReset();
  });

  it("collects populated image and icon identifiers", () => {
    expect(
      collectAssetIdsFromCard({
        imageAssetId: "image-1",
        monsterIconAssetId: "monster-icon-1",
        iconAssetId: "icon-1",
      }),
    ).toEqual(["image-1", "monster-icon-1", "icon-1"]);
    expect(collectAssetIdsFromCard({ imageAssetId: "" })).toEqual([]);
  });

  it("collects only custom hero-back logo identifiers", () => {
    expect(
      collectHeroBackLogoIdsFromCard({ heroBackLogoMode: "custom", heroBackLogoId: "logo-1" }),
    ).toEqual(["logo-1"]);
    expect(
      collectHeroBackLogoIdsFromCard({ heroBackLogoMode: "default", heroBackLogoId: "logo-1" }),
    ).toEqual([]);
  });

  it("deduplicates asset requests and records empty or failed results as missing", async () => {
    const blob = new Blob(["asset"]);
    getAssetBlob.mockImplementation(({ params }: { params: { id: string } }) => {
      if (params.id === "found") return Promise.resolve(blob);
      if (params.id === "empty") return Promise.resolve(null);
      return Promise.reject(new Error("request failed"));
    });

    const result = await buildAssetCache(["found", "found", "empty", "failed"]);

    expect(getAssetBlob).toHaveBeenCalledTimes(3);
    expect(result.cache).toEqual(new Map([["found", blob]]));
    expect(result.missing).toEqual(new Set(["empty", "failed"]));
  });

  it("deduplicates logo requests and records empty or failed results as missing", async () => {
    const blob = new Blob(["logo"]);
    getHeroBackLogoBlob.mockImplementation((id: string) => {
      if (id === "found") return Promise.resolve(blob);
      if (id === "empty") return Promise.resolve(null);
      return Promise.reject(new Error("request failed"));
    });

    const result = await buildHeroBackLogoCache(["found", "found", "empty", "failed"]);

    expect(getHeroBackLogoBlob).toHaveBeenCalledTimes(3);
    expect(result.cache).toEqual(new Map([["found", blob]]));
    expect(result.missing).toEqual(new Set(["empty", "failed"]));
  });

  it("reports missing card assets with useful labels and card context", async () => {
    getAssetBlob.mockResolvedValue(null);
    getHeroBackLogoBlob.mockResolvedValue(null);
    const thumbnailBlob = new Blob(["thumbnail"]);
    const card = createCard({
      title: "Barbarian",
      face: "front",
      imageAssetId: "image-1",
      monsterIconAssetId: "icon-1",
      monsterIconAssetName: "Skull",
      heroBackLogoMode: "custom",
      heroBackLogoId: "logo-1",
      heroBackLogoName: "Crest",
      thumbnailBlob,
    });

    await expect(buildMissingAssetsReport([card])).resolves.toEqual([
      {
        cardId: "card-1",
        title: "Barbarian",
        templateId: "hero",
        face: "front",
        thumbnailBlob,
        missing: [
          { label: "image", id: "image-1", name: "unknown" },
          { label: "icon", id: "icon-1", name: "Skull" },
          { label: "logo", id: "logo-1", name: "Crest" },
        ],
      },
    ]);
  });

  it("omits cards whose referenced assets are available", async () => {
    getAssetBlob.mockResolvedValue(new Blob(["asset"]));
    getHeroBackLogoBlob.mockResolvedValue(new Blob(["logo"]));

    await expect(
      buildMissingAssetsReport([
        createCard({
          imageAssetId: "image-1",
          heroBackLogoMode: "custom",
          heroBackLogoId: "logo-1",
        }),
      ]),
    ).resolves.toEqual([]);
  });
});
