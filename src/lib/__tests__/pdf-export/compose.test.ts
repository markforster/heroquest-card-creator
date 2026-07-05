jest.mock("@/api/client", () => ({
  apiClient: {
    listDeckGroups: jest.fn(),
    listDeckSets: jest.fn(),
    listDeckEntries: jest.fn(),
  },
}));

jest.mock("@/components/Decks/deck-preview", () => ({
  listPairsMap: jest.fn(),
}));

import { apiClient } from "@/api/client";
import { listPairsMap } from "@/components/Decks/deck-preview";
import { composeDeckSlotPairs, composePrintComposition } from "@/lib/pdf-export/compose";

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockedListPairsMap = listPairsMap as jest.MockedFunction<typeof listPairsMap>;

describe("pdf-export compose", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("chunks slot pairs by page capacity", () => {
    const slots = [
      { slotId: "1", frontId: "f1", backId: "b1" },
      { slotId: "2", frontId: "f2", backId: "b2" },
      { slotId: "3", frontId: "f3", backId: "b3" },
    ];
    const composition = composePrintComposition(slots, 2);
    expect(composition.totalSlots).toBe(3);
    expect(composition.sheets).toHaveLength(2);
    expect(composition.sheets[0].slots).toHaveLength(2);
    expect(composition.sheets[1].slots).toHaveLength(1);
  });

  it("returns an empty composition when page capacity is invalid or there are no slots", () => {
    expect(composePrintComposition([], 4)).toEqual({ sheets: [], totalSlots: 0 });
    expect(composePrintComposition([{ slotId: "1", frontId: "f1", backId: null }], 0)).toEqual({
      sheets: [],
      totalSlots: 0,
    });
  });

  it("composes ordered front-and-back slot pairs from groups, sets, entries, and counts", async () => {
    mockedApiClient.listDeckGroups.mockResolvedValue([
      { id: "group-b", sortIndex: 2 },
      { id: "group-a", sortIndex: 1 },
    ] as never);
    mockedApiClient.listDeckSets.mockResolvedValue([
      { id: "set-2", groupId: "group-b", sortIndex: 1, backFaceId: "back-2" },
      { id: "set-3", groupId: "missing-group", sortIndex: 1, backFaceId: "back-3" },
      { id: "set-1", groupId: "group-a", sortIndex: 2, backFaceId: "back-1" },
      { id: "set-0", groupId: "group-a", sortIndex: 1, backFaceId: "back-0" },
    ] as never);
    mockedApiClient.listDeckEntries.mockImplementation(async ({ params: { setId } }) => {
      switch (setId) {
        case "set-0":
          return [
            { id: "entry-2", pairId: "pair-2", sortIndex: 2, count: 2 },
            { id: "entry-1", pairId: "pair-1", sortIndex: 1, count: 1 },
          ] as never;
        case "set-1":
          return [{ id: "entry-3", pairId: "missing-front", sortIndex: 1, count: 1 }] as never;
        case "set-2":
          return [{ id: "entry-4", pairId: "pair-4", sortIndex: 1, count: 0 }] as never;
        default:
          return [] as never;
      }
    });
    mockedListPairsMap.mockResolvedValue(
      new Map([
        ["pair-1", { frontFaceId: "front-1" }],
        ["pair-2", { frontFaceId: "front-2" }],
        ["pair-4", { frontFaceId: "front-4" }],
        ["missing-front", { frontFaceId: null }],
      ]),
    );

    const slotPairs = await composeDeckSlotPairs("deck-1", "frontAndBack");

    expect(slotPairs).toEqual([
      { slotId: "set-0:entry-1:0", frontId: "front-1", backId: "back-0" },
      { slotId: "set-0:entry-2:0", frontId: "front-2", backId: "back-0" },
      { slotId: "set-0:entry-2:1", frontId: "front-2", backId: "back-0" },
      { slotId: "set-2:entry-4:0", frontId: "front-4", backId: "back-2" },
    ]);
  });

  it("drops back ids in fronts-only mode", async () => {
    mockedApiClient.listDeckGroups.mockResolvedValue([{ id: "group-a", sortIndex: 1 }] as never);
    mockedApiClient.listDeckSets.mockResolvedValue([
      { id: "set-0", groupId: "group-a", sortIndex: 1, backFaceId: "back-0" },
    ] as never);
    mockedApiClient.listDeckEntries.mockResolvedValue([
      { id: "entry-1", pairId: "pair-1", sortIndex: 1, count: 1 },
    ] as never);
    mockedListPairsMap.mockResolvedValue(new Map([["pair-1", { frontFaceId: "front-1" }]]));

    await expect(composeDeckSlotPairs("deck-1", "frontsOnly")).resolves.toEqual([
      { slotId: "set-0:entry-1:0", frontId: "front-1", backId: null },
    ]);
  });
});
