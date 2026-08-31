const getCard = jest.fn();
const runBulkExport = jest.fn();

jest.mock("@/api/client", () => ({
  apiClient: {
    getCard: (...args: unknown[]) => getCard(...args),
  },
}));

jest.mock("@/lib/export-cards", () => ({
  runBulkExport: (...args: unknown[]) => runBulkExport(...args),
}));

import { exportFaceIdsToZip } from "@/lib/export-face-ids";

describe("exportFaceIdsToZip", () => {
  const previewRef = { current: null };

  beforeEach(() => {
    getCard.mockReset();
    runBulkExport.mockReset();
  });

  it("returns an empty result without loading cards when no IDs are provided", async () => {
    await expect(exportFaceIdsToZip([], { previewRef })).resolves.toEqual({
      status: "empty",
      exportedCount: 0,
    });
    expect(getCard).not.toHaveBeenCalled();
  });

  it("omits cards that cannot be loaded and returns empty if all loads fail", async () => {
    getCard.mockRejectedValue(new Error("missing"));

    await expect(exportFaceIdsToZip(["missing"], { previewRef })).resolves.toEqual({
      status: "empty",
      exportedCount: 0,
    });
    expect(runBulkExport).not.toHaveBeenCalled();
  });

  it("loads available cards and delegates the export options", async () => {
    const card = { id: "card-1", name: "Card" };
    const result = { status: "complete", exportedCount: 1 };
    const onProgress = jest.fn();
    getCard.mockResolvedValueOnce(card).mockRejectedValueOnce(new Error("missing"));
    runBulkExport.mockResolvedValue(result);

    await expect(
      exportFaceIdsToZip(["card-1", "missing"], {
        previewRef,
        onProgress,
        bleedPx: 12,
      }),
    ).resolves.toBe(result);

    expect(runBulkExport).toHaveBeenCalledWith(
      expect.objectContaining({ cards: [card], previewRef, onProgress, bleedPx: 12 }),
    );
  });
});
