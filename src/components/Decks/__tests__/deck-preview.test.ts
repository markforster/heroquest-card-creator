import { resolveDeckPreviewIds } from "@/components/Decks/deck-preview";

const mockGetDeck = jest.fn();
const mockListDeckGroups = jest.fn();
const mockListDeckSets = jest.fn();
const mockListDeckEntries = jest.fn();

jest.mock("@/api/client", () => ({
  apiClient: {
    getDeck: (...args: unknown[]) => mockGetDeck(...args),
    listDeckGroups: (...args: unknown[]) => mockListDeckGroups(...args),
    listDeckSets: (...args: unknown[]) => mockListDeckSets(...args),
    listDeckEntries: (...args: unknown[]) => mockListDeckEntries(...args),
    listPairs: jest.fn(),
  },
}));

describe("resolveDeckPreviewIds visual prioritization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDeck.mockResolvedValue({ id: "deck-1" });
    mockListDeckGroups.mockResolvedValue([{ id: "g1", sortIndex: 0 }]);
  });

  it("places first back in center slot for odd count", async () => {
    mockListDeckSets.mockResolvedValue([
      { id: "s1", groupId: "g1", backFaceId: "b1", sortIndex: 0 },
      { id: "s2", groupId: "g1", backFaceId: "b2", sortIndex: 1 },
      { id: "s3", groupId: "g1", backFaceId: "b3", sortIndex: 2 },
    ]);
    mockListDeckEntries.mockResolvedValue([]);

    const ids = await resolveDeckPreviewIds({
      deckId: "deck-1",
      maxCount: 5,
      pairMap: new Map(),
    });

    expect(ids).toEqual(["b3", "b1", "b2"]);
  });

  it("places first back in right-middle slot for even count", async () => {
    mockListDeckSets.mockResolvedValue([
      { id: "s1", groupId: "g1", backFaceId: "b1", sortIndex: 0 },
      { id: "s2", groupId: "g1", backFaceId: "b2", sortIndex: 1 },
      { id: "s3", groupId: "g1", backFaceId: "b3", sortIndex: 2 },
      { id: "s4", groupId: "g1", backFaceId: "b4", sortIndex: 3 },
    ]);
    mockListDeckEntries.mockResolvedValue([]);

    const ids = await resolveDeckPreviewIds({
      deckId: "deck-1",
      maxCount: 4,
      pairMap: new Map(),
    });

    expect(ids).toEqual(["b4", "b2", "b1", "b3"]);
  });

  it("fills with fronts only after all available backs", async () => {
    const pairMap = new Map([
      ["p1", { id: "p1", frontFaceId: "f1" }],
      ["p2", { id: "p2", frontFaceId: "f2" }],
      ["p3", { id: "p3", frontFaceId: "f3" }],
    ]);
    mockListDeckSets.mockResolvedValue([
      { id: "s1", groupId: "g1", backFaceId: "b1", sortIndex: 0 },
      { id: "s2", groupId: "g1", backFaceId: "b2", sortIndex: 1 },
    ]);
    mockListDeckEntries.mockImplementation(({ params }: { params: { setId: string } }) => {
      if (params.setId === "s1") {
        return Promise.resolve([
          { id: "e1", pairId: "p1", sortIndex: 0 },
          { id: "e2", pairId: "p2", sortIndex: 1 },
          { id: "e3", pairId: "p3", sortIndex: 2 },
        ]);
      }
      return Promise.resolve([]);
    });

    const ids = await resolveDeckPreviewIds({
      deckId: "deck-1",
      maxCount: 5,
      pairMap,
    });

    expect(ids).toEqual(["f3", "f1", "b1", "b2", "f2"]);
  });

  it("deduplicates faces and enforces maxCount", async () => {
    const pairMap = new Map([
      ["p1", { id: "p1", frontFaceId: "f1" }],
      ["p2", { id: "p2", frontFaceId: "b1" }],
    ]);
    mockListDeckSets.mockResolvedValue([
      { id: "s1", groupId: "g1", backFaceId: "b1", sortIndex: 0 },
      { id: "s2", groupId: "g1", backFaceId: "b1", sortIndex: 1 },
      { id: "s3", groupId: "g1", backFaceId: "b2", sortIndex: 2 },
    ]);
    mockListDeckEntries.mockResolvedValue([
      { id: "e1", pairId: "p1", sortIndex: 0 },
      { id: "e2", pairId: "p2", sortIndex: 1 },
    ]);

    const ids = await resolveDeckPreviewIds({
      deckId: "deck-1",
      maxCount: 3,
      pairMap,
    });

    expect(ids).toEqual(["f1", "b1", "b2"]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
