import { apiClient } from "@/api/client";
import {
  parseDeckPdfPlaceholderFrontId,
  resolveDeckPdfExportSummary,
  resolveDeckPdfRunData,
  summarizeDeckPdfRunData,
} from "@/components/Decks/deck-export";

jest.mock("@/api/client", () => ({
  apiClient: {
    listDeckSets: jest.fn(),
    listCards: jest.fn(),
    listDeckEntries: jest.fn(),
    listPairs: jest.fn(),
  },
}));

describe("resolveDeckPdfExportSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("excludes empty sets and computes totals for front+back", async () => {
    (apiClient.listDeckSets as jest.Mock).mockResolvedValue([
      { id: "set-1", title: "Set One", backFaceId: "back-1" },
      { id: "set-2", title: "Set Two", backFaceId: "back-2" },
    ]);
    (apiClient.listCards as jest.Mock).mockResolvedValue([]);
    (apiClient.listDeckEntries as jest.Mock).mockImplementation(
      ({ params }: { params: { setId: string } }) => {
        if (params.setId === "set-1") {
          return Promise.resolve([
            { id: "e1", pairId: "pair-1", count: 2, sortIndex: 0 },
            { id: "e2", pairId: "pair-2", count: 1, sortIndex: 1 },
          ]);
        }
        return Promise.resolve([]);
      },
    );
    (apiClient.listPairs as jest.Mock).mockResolvedValue([
      { id: "pair-1", frontFaceId: "front-1" },
      { id: "pair-2", frontFaceId: "front-2" },
    ]);

    const result = await resolveDeckPdfExportSummary("deck-1", "frontAndBack");

    expect(result.includedSetCount).toBe(1);
    expect(result.emptyIncludedSetCount).toBe(0);
    expect(result.emptyExcludedSetCount).toBe(1);
    expect(result.totalEntryQuantity).toBe(3);
    expect(result.frontFaceCount).toBe(3);
    expect(result.backFaceCount).toBe(3);
    expect(result.totalFaceCount).toBe(6);
    expect(result.sets).toHaveLength(2);
  });

  it("uses fronts-only mode totals and defaults quantity to one", async () => {
    (apiClient.listDeckSets as jest.Mock).mockResolvedValue([{ id: "set-1", title: null, backFaceId: "back-1" }]);
    (apiClient.listCards as jest.Mock).mockResolvedValue([{ id: "back-1", title: "Fallback Title", name: "" }]);
    (apiClient.listDeckEntries as jest.Mock).mockResolvedValue([
      { id: "e1", pairId: "pair-1", sortIndex: 0 },
      { id: "e2", pairId: "pair-2", count: 0, sortIndex: 1 },
    ]);
    (apiClient.listPairs as jest.Mock).mockResolvedValue([
      { id: "pair-1", frontFaceId: "front-1" },
      { id: "pair-2", frontFaceId: "front-2" },
    ]);

    const result = await resolveDeckPdfExportSummary("deck-1", "frontsOnly");

    expect(result.totalEntryQuantity).toBe(2);
    expect(result.frontFaceCount).toBe(2);
    expect(result.backFaceCount).toBe(0);
    expect(result.totalFaceCount).toBe(2);
  });

  it("includes empty sets as placeholders in all-sets scope", async () => {
    (apiClient.listDeckSets as jest.Mock).mockResolvedValue([
      { id: "set-1", title: "Set One", backFaceId: "back-1" },
      { id: "set-2", title: "Set Two", backFaceId: "back-2" },
    ]);
    (apiClient.listCards as jest.Mock).mockResolvedValue([]);
    (apiClient.listDeckEntries as jest.Mock).mockImplementation(
      ({ params }: { params: { setId: string } }) => {
        if (params.setId === "set-1") {
          return Promise.resolve([{ id: "e1", pairId: "pair-1", count: 1, sortIndex: 0 }]);
        }
        return Promise.resolve([]);
      },
    );
    (apiClient.listPairs as jest.Mock).mockResolvedValue([{ id: "pair-1", frontFaceId: "front-1" }]);

    const runData = await resolveDeckPdfRunData("deck-1", "frontAndBack", "all", []);
    const summary = summarizeDeckPdfRunData(runData, "frontAndBack", "all", new Set());

    expect(runData.slotPairs).toHaveLength(2);
    const placeholderSlot = runData.slotPairs.find((slot) => slot.slotId.startsWith("set-2:empty:"));
    expect(placeholderSlot?.frontId).toBeTruthy();
    expect(parseDeckPdfPlaceholderFrontId(placeholderSlot?.frontId ?? "")).toEqual({ setId: "set-2" });
    expect(summary.emptyIncludedSetCount).toBe(1);
    expect(summary.emptyExcludedSetCount).toBe(0);
  });

  it("selected scope honors explicit set selection", async () => {
    (apiClient.listDeckSets as jest.Mock).mockResolvedValue([
      { id: "set-1", title: "Set One", backFaceId: "back-1" },
      { id: "set-2", title: "Set Two", backFaceId: "back-2" },
    ]);
    (apiClient.listCards as jest.Mock).mockResolvedValue([]);
    (apiClient.listDeckEntries as jest.Mock).mockImplementation(
      ({ params }: { params: { setId: string } }) =>
        Promise.resolve([{ id: `${params.setId}-e1`, pairId: "pair-1", count: 1, sortIndex: 0 }]),
    );
    (apiClient.listPairs as jest.Mock).mockResolvedValue([{ id: "pair-1", frontFaceId: "front-1" }]);

    const runData = await resolveDeckPdfRunData("deck-1", "frontsOnly", "selected", ["set-2"]);
    const summary = summarizeDeckPdfRunData(runData, "frontsOnly", "selected", new Set(["set-2"]));
    expect(runData.slotPairs).toHaveLength(1);
    expect(runData.slotPairs[0]?.slotId.startsWith("set-2:")).toBe(true);
    expect(summary.includedSetCount).toBe(1);
  });
});
