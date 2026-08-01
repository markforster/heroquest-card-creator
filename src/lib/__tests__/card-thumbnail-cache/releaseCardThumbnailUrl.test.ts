import { releaseCardThumbnailUrl } from "@/lib/card-thumbnail-cache";

describe("releaseCardThumbnailUrl", () => {
  it("accepts empty and unknown card IDs as a compatibility no-op", () => {
    expect(() => releaseCardThumbnailUrl("")).not.toThrow();
    expect(() => releaseCardThumbnailUrl("unknown-card")).not.toThrow();
  });
});
