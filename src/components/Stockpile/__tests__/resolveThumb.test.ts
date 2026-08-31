const getCachedCardThumbnailUrl = jest.fn();

jest.mock("@/lib/card-thumbnail-cache", () => ({
  getCachedCardThumbnailUrl: (...args: unknown[]) => getCachedCardThumbnailUrl(...args),
  getLegacyCardThumbnailUrl: jest.fn(),
  releaseLegacyCardThumbnailUrl: jest.fn(),
}));

import resolveThumb from "@/components/Stockpile/resolveThumb";

describe("resolveThumb", () => {
  it("resolves through the shared thumbnail cache", () => {
    const blob = new Blob(["thumb"]);
    getCachedCardThumbnailUrl.mockReturnValue("blob:thumb");
    expect(resolveThumb("card-1", blob)).toEqual({ url: "blob:thumb", onLoad: undefined });
    expect(getCachedCardThumbnailUrl).toHaveBeenCalledWith("card-1", blob);
  });
});
