import { normalizeSelfPairings } from "@/lib/data/cards-db";

describe("normalizeSelfPairings", () => {
  it("is a no-op for the current dedicated pairs store", async () => {
    await expect(normalizeSelfPairings()).resolves.toBe(0);
  });
});
