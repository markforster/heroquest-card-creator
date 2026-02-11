import { renderHook } from "@testing-library/react";

import { useStockpileFilters } from "@/components/Stockpile/hooks/useStockpileFilters";
import type { CardRecord } from "@/types/cards-db";
import type { CollectionRecord } from "@/types/collections-db";

jest.mock("@/data/card-templates", () => ({
  cardTemplatesById: {
    hero: { defaultFace: "front" },
    monster: { defaultFace: "front" },
    "large-treasure": { defaultFace: "front" },
    "small-treasure": { defaultFace: "front" },
    "hero-back": { defaultFace: "back" },
    "labelled-back": { defaultFace: "back" },
  },
}));

const baseCard = (overrides: Partial<CardRecord>): CardRecord => ({
  id: "card",
  templateId: "hero",
  status: "saved",
  name: "Card",
  nameLower: "card",
  createdAt: 0,
  updatedAt: 0,
  schemaVersion: 1,
  ...overrides,
});

const baseCollection = (overrides: Partial<CollectionRecord>): CollectionRecord => ({
  id: "collection",
  name: "Collection",
  cardIds: [],
  createdAt: 0,
  updatedAt: 0,
  schemaVersion: 1,
  ...overrides,
});

describe("useStockpileFilters", () => {
  it("returns recentCards sorted by lastViewedAt then updatedAt", () => {
    const cards = [
      baseCard({ id: "a", lastViewedAt: 100, updatedAt: 5, nameLower: "a" }),
      baseCard({ id: "b", lastViewedAt: 200, updatedAt: 1, nameLower: "b" }),
      baseCard({ id: "c", lastViewedAt: 100, updatedAt: 10, nameLower: "c" }),
    ];

    const { result } = renderHook(() =>
      useStockpileFilters({
        cards,
        collections: [],
        search: "",
        templateFilter: "all",
        activeFilter: { type: "all" },
        isPairMode: false,
        isPairBacks: false,
      }),
    );

    expect(result.current.recentCards.map((card) => card.id)).toEqual(["b", "c", "a"]);
  });

  it("filters to recent cards in pair-back mode", () => {
    const cards = [
      baseCard({ id: "front-1", templateId: "hero", lastViewedAt: 10 }),
      baseCard({ id: "back-1", templateId: "hero-back", lastViewedAt: 20 }),
    ];

    const { result } = renderHook(() =>
      useStockpileFilters({
        cards,
        collections: [],
        search: "",
        templateFilter: "all",
        activeFilter: { type: "recent" },
        isPairMode: true,
        isPairBacks: true,
      }),
    );

    expect(result.current.filteredCards.map((card) => card.id)).toEqual(["back-1"]);
  });

  it("computes collection counts and unfiled count", () => {
    const cards = [
      baseCard({ id: "a", nameLower: "alpha" }),
      baseCard({ id: "b", nameLower: "beta" }),
      baseCard({ id: "c", nameLower: "gamma" }),
    ];
    const collections = [
      baseCollection({ id: "col-1", cardIds: ["a", "b"] }),
      baseCollection({ id: "col-2", cardIds: ["b"] }),
    ];

    const { result } = renderHook(() =>
      useStockpileFilters({
        cards,
        collections,
        search: "",
        templateFilter: "all",
        activeFilter: { type: "all" },
        isPairMode: false,
        isPairBacks: false,
      }),
    );

    expect(result.current.collectionCounts.get("col-1")).toBe(2);
    expect(result.current.collectionCounts.get("col-2")).toBe(1);
    expect(result.current.unfiledCount).toBe(1);
  });

  it("filters by templateFilter front/back and specific template id", () => {
    const cards = [
      baseCard({ id: "front-1", templateId: "hero" }),
      baseCard({ id: "back-1", templateId: "hero-back" }),
      baseCard({ id: "front-2", templateId: "large-treasure" }),
    ];

    const frontResult = renderHook(() =>
      useStockpileFilters({
        cards,
        collections: [],
        search: "",
        templateFilter: "front",
        activeFilter: { type: "all" },
        isPairMode: false,
        isPairBacks: false,
      }),
    ).result;

    expect(frontResult.current.filteredCards.map((card) => card.id)).toEqual([
      "front-1",
      "front-2",
    ]);

    const backResult = renderHook(() =>
      useStockpileFilters({
        cards,
        collections: [],
        search: "",
        templateFilter: "back",
        activeFilter: { type: "all" },
        isPairMode: false,
        isPairBacks: false,
      }),
    ).result;

    expect(backResult.current.filteredCards.map((card) => card.id)).toEqual(["back-1"]);

    const idResult = renderHook(() =>
      useStockpileFilters({
        cards,
        collections: [],
        search: "",
        templateFilter: "large-treasure",
        activeFilter: { type: "all" },
        isPairMode: false,
        isPairBacks: false,
      }),
    ).result;

    expect(idResult.current.filteredCards.map((card) => card.id)).toEqual(["front-2"]);
  });

  it("filters by search and unfiled filter", () => {
    const cards = [
      baseCard({ id: "a", nameLower: "alpha" }),
      baseCard({ id: "b", nameLower: "bravo" }),
    ];
    const collections = [baseCollection({ id: "col-1", cardIds: ["a"] })];

    const { result } = renderHook(() =>
      useStockpileFilters({
        cards,
        collections,
        search: "br",
        templateFilter: "all",
        activeFilter: { type: "unfiled" },
        isPairMode: false,
        isPairBacks: false,
      }),
    );

    expect(result.current.filteredCards.map((card) => card.id)).toEqual(["b"]);
  });
});
