import { renderHook, waitFor } from "@testing-library/react";

import type { CardRecord } from "@/api/cards";
import type { CollectionRecord } from "@/api/collections";
import { useStockpileData } from "@/components/Stockpile/hooks/useStockpileData";

const mockUseListCards = jest.fn();
const mockUseListCollections = jest.fn();
const mockRefetchCards = jest.fn();

jest.mock("@/api/hooks", () => ({
  useListCards: (...args: unknown[]) => mockUseListCards(...args),
  useListCollections: (...args: unknown[]) => mockUseListCollections(...args),
}));

describe("useStockpileData", () => {
  beforeEach(() => {
    mockUseListCards.mockReset();
    mockUseListCollections.mockReset();
    mockRefetchCards.mockReset();
    window.localStorage.clear();
    mockRefetchCards.mockResolvedValue({ data: [] });
    mockUseListCards.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: mockRefetchCards,
    });
    mockUseListCollections.mockReturnValue({
      data: [],
      isLoading: false,
    });
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
    mockUseListCards.mockReturnValue({
      data: cards,
      isLoading: false,
      refetch: mockRefetchCards,
    });
    mockUseListCollections.mockReturnValue({
      data: collections,
      isLoading: false,
    });

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

    expect(mockUseListCards).toHaveBeenCalledWith({
      queries: { status: "saved", deleted: "include" },
    }, expect.any(Object));
    expect(mockUseListCollections).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ enabled: true }),
    );
  });

  it("seeds cards immediately from a cached query snapshot on mount", () => {
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
    mockUseListCards.mockReturnValue({
      data: cards,
      isLoading: false,
      refetch: mockRefetchCards,
    });

    const setActiveFilter = jest.fn();
    const { result } = renderHook(() =>
      useStockpileData({
        isOpen: true,
        refreshToken: 0,
        activeFilter: { type: "all" },
        setActiveFilter,
      }),
    );

    expect(result.current.cards).toEqual(cards);
    expect(result.current.isLoadingCards).toBe(false);
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

    expect(mockUseListCards).toHaveBeenCalledWith(
      { queries: { status: "saved", deleted: "include" } },
      expect.objectContaining({ enabled: false }),
    );
    expect(mockUseListCollections).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ enabled: false }),
    );
  });

  it("hydrates stored collection and sets active filter", async () => {
    window.localStorage.setItem("hqcc.selectedCollectionId", "col-1");
    mockUseListCollections.mockReturnValue({
      data: [
      {
        id: "col-1",
        name: "Collection",
        cardIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        schemaVersion: 1,
      },
      ],
      isLoading: false,
    });

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

  it("keeps the stockpile loading until the first cards snapshot resolves", async () => {
    mockUseListCards.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: mockRefetchCards,
    });

    const setActiveFilter = jest.fn();
    const { result, rerender } = renderHook(() =>
      useStockpileData({
        isOpen: true,
        refreshToken: 0,
        activeFilter: { type: "all" },
        setActiveFilter,
      }),
    );

    expect(result.current.isLoadingCards).toBe(true);
    expect(result.current.cards).toEqual([]);

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

    mockUseListCards.mockReturnValue({
      data: cards,
      isLoading: false,
      refetch: mockRefetchCards,
    });

    rerender();

    await waitFor(() => {
      expect(result.current.isLoadingCards).toBe(false);
      expect(result.current.cards).toEqual(cards);
    });
  });

  it("does not flash an empty cards state when the hook remounts with cached data", () => {
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
    mockUseListCards.mockReturnValue({
      data: cards,
      isLoading: false,
      refetch: mockRefetchCards,
    });

    const setActiveFilter = jest.fn();
    const { result, unmount } = renderHook(() =>
      useStockpileData({
        isOpen: true,
        refreshToken: 0,
        activeFilter: { type: "all" },
        setActiveFilter,
      }),
    );

    expect(result.current.cards).toEqual(cards);
    expect(result.current.isLoadingCards).toBe(false);

    unmount();

    const remounted = renderHook(() =>
      useStockpileData({
        isOpen: true,
        refreshToken: 0,
        activeFilter: { type: "all" },
        setActiveFilter,
      }),
    );

    expect(remounted.result.current.cards).toEqual(cards);
    expect(remounted.result.current.isLoadingCards).toBe(false);
  });
});
