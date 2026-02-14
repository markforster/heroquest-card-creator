import { renderHook, waitFor } from "@testing-library/react";

import { useStockpileData } from "@/components/Stockpile/hooks/useStockpileData";
import type { CardRecord } from "@/types/cards-db";
import type { CollectionRecord } from "@/types/collections-db";

const mockListCards = jest.fn();
const mockListCollections = jest.fn();

jest.mock("@/lib/cards-db", () => ({
  listCards: (...args: unknown[]) => mockListCards(...args),
}));

jest.mock("@/lib/collections-db", () => ({
  listCollections: (...args: unknown[]) => mockListCollections(...args),
}));

describe("useStockpileData", () => {
  beforeEach(() => {
    mockListCards.mockReset();
    mockListCollections.mockReset();
    window.localStorage.clear();
  });

  it("loads cards and collections when open", async () => {
    const cards: CardRecord[] = [
      {
        id: "card-1",
        name: "Card 1",
        nameLower: "card 1",
        templateId: "hero",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "saved",
        schemaVersion: 1,
      },
    ];
    const collections: CollectionRecord[] = [
      {
        id: "col-1",
        name: "Collection",
        cardIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        schemaVersion: 1,
      },
    ];
    mockListCards.mockResolvedValue(cards);
    mockListCollections.mockResolvedValue(collections);

    const setActiveFilter = jest.fn();
    const { result } = renderHook(() =>
      useStockpileData({
        isOpen: true,
        refreshToken: 1,
        activeFilter: { type: "all" },
        setActiveFilter,
      }),
    );

    await waitFor(() => {
      expect(result.current.cards).toHaveLength(1);
      expect(result.current.collections).toHaveLength(1);
    });

    expect(mockListCards).toHaveBeenCalledWith({ status: "saved" });
    expect(mockListCollections).toHaveBeenCalledTimes(1);
  });

  it("does not load data when closed", () => {
    const setActiveFilter = jest.fn();
    renderHook(() =>
      useStockpileData({
        isOpen: false,
        refreshToken: 1,
        activeFilter: { type: "all" },
        setActiveFilter,
      }),
    );

    expect(mockListCards).not.toHaveBeenCalled();
    expect(mockListCollections).not.toHaveBeenCalled();
  });

  it("hydrates stored collection and sets active filter", async () => {
    window.localStorage.setItem("hqcc.selectedCollectionId", "col-1");
    mockListCards.mockResolvedValue([]);
    mockListCollections.mockResolvedValue([
      {
        id: "col-1",
        name: "Collection",
        cardIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        schemaVersion: 1,
      },
    ]);

    const setActiveFilter = jest.fn();
    renderHook(() =>
      useStockpileData({
        isOpen: true,
        refreshToken: 0,
        activeFilter: { type: "all" },
        setActiveFilter,
      }),
    );

    await waitFor(() => {
      expect(setActiveFilter).toHaveBeenCalledWith({ type: "collection", id: "col-1" });
    });
  });

  it("persists active collection id to localStorage", async () => {
    mockListCards.mockResolvedValue([]);
    mockListCollections.mockResolvedValue([]);

    const setActiveFilter = jest.fn();
    renderHook(() =>
      useStockpileData({
        isOpen: true,
        refreshToken: 0,
        activeFilter: { type: "collection", id: "col-2" },
        setActiveFilter,
      }),
    );

    await waitFor(() => {
      expect(window.localStorage.getItem("hqcc.selectedCollectionId")).toBe("col-2");
    });
  });

  it("clears stored collection when active filter is not collection", async () => {
    window.localStorage.setItem("hqcc.selectedCollectionId", "col-3");
    mockListCards.mockResolvedValue([]);
    mockListCollections.mockResolvedValue([]);

    const setActiveFilter = jest.fn();
    renderHook(() =>
      useStockpileData({
        isOpen: true,
        refreshToken: 0,
        activeFilter: { type: "all" },
        setActiveFilter,
      }),
    );

    await waitFor(() => {
      expect(window.localStorage.getItem("hqcc.selectedCollectionId")).toBeNull();
    });
  });
});
