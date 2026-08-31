const getCachedCardThumbnailUrl = jest.fn();

jest.mock("@/lib/card-thumbnail-cache", () => ({
  getCachedCardThumbnailUrl: (...args: unknown[]) => getCachedCardThumbnailUrl(...args),
  getLegacyCardThumbnailUrl: jest.fn(),
  releaseLegacyCardThumbnailUrl: jest.fn(),
}));

import { resolveStockpileThumb } from "@/components/Stockpile/stockpile-thumbs";

describe("resolveStockpileThumb", () => {
  it("resolves through the shared thumbnail cache", () => {
    getCachedCardThumbnailUrl.mockReturnValue(null);
    expect(resolveStockpileThumb("card-1", null)).toEqual({ url: null, onLoad: undefined });
    expect(getCachedCardThumbnailUrl).toHaveBeenCalledWith("card-1", null);
  });
});
