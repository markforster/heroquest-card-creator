import { apiClient } from "@/api/client";
import { resolveDeckPdfExportSummary } from "@/components/Decks/deck-export";

jest.mock("@/api/client", () => ({
  apiClient: {
    listDeckSets: jest.fn(),
    listCards: jest.fn(),
    listDeckEntries: jest.fn(),
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
          return Promise.resolve([{ id: "e1", count: 2 }, { id: "e2", count: 1 }]);
        }
        return Promise.resolve([]);
      },
    );

    const result = await resolveDeckPdfExportSummary("deck-1", "frontAndBack");

    expect(result.includedSetCount).toBe(1);
    expect(result.excludedSetCount).toBe(1);
    expect(result.totalEntryQuantity).toBe(3);
    expect(result.frontFaceCount).toBe(3);
    expect(result.backFaceCount).toBe(3);
    expect(result.totalFaceCount).toBe(6);
    expect(result.excludedSets).toEqual([
      { setId: "set-2", setTitle: "Set Two", backFaceId: "back-2" },
    ]);
  });

  it("uses fronts-only mode totals and defaults quantity to one", async () => {
    (apiClient.listDeckSets as jest.Mock).mockResolvedValue([{ id: "set-1", title: null, backFaceId: "back-1" }]);
    (apiClient.listCards as jest.Mock).mockResolvedValue([{ id: "back-1", title: "Fallback Title", name: "" }]);
    (apiClient.listDeckEntries as jest.Mock).mockResolvedValue([{ id: "e1" }, { id: "e2", count: 0 }]);

    const result = await resolveDeckPdfExportSummary("deck-1", "frontsOnly");

    expect(result.totalEntryQuantity).toBe(2);
    expect(result.frontFaceCount).toBe(2);
    expect(result.backFaceCount).toBe(0);
    expect(result.totalFaceCount).toBe(2);
  });
});
