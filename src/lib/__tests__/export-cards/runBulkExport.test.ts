jest.mock("@/lib/export-logging", () => ({
  startExportLogging: () => ({ startedAt: 0 }),
  logDeviceInfo: jest.fn(),
  logSummary: jest.fn(),
  endExportLogging: jest.fn(),
  logAssetPrefetch: jest.fn(),
  logCardInfo: jest.fn(),
  logCardFileName: jest.fn(),
  logCardRender: jest.fn(),
  logCardSkip: jest.fn(),
  logCardWait: jest.fn(),
}));

import { runBulkExport } from "@/lib/export-cards";

describe("runBulkExport", () => {
  const common = {
    previewRef: { current: null },
    resolveName: jest.fn(),
    resolveZipName: jest.fn(),
    shouldCancel: () => false,
    onTargetChange: jest.fn(),
    onProgress: jest.fn(),
  };

  it("returns empty without rendering when no cards are provided", async () => {
    await expect(runBulkExport({ ...common, cards: [] })).resolves.toEqual({
      status: "empty",
      exportedCount: 0,
    });
  });
});
