const table = {
  orderBy: jest.fn(),
};

jest.mock("@/lib/db/hqcc-dexie", () => ({
  openHqccDexieDb: jest.fn(async () => ({ table: () => table })),
}));

jest.mock("@/lib/db/maintenance/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: jest.fn(),
}));

import { listHeroBackLogosWithBlobs } from "@/lib/data/hero-back-logos-db";

describe("listHeroBackLogosWithBlobs", () => {
  it("returns only records that contain Blob payloads", async () => {
    const blob = new Blob(["logo"]);
    table.orderBy.mockReturnValue({
      toArray: jest.fn(async () => [{ id: "with-blob", blob }, { id: "metadata-only" }]),
    });

    await expect(listHeroBackLogosWithBlobs()).resolves.toEqual([{ id: "with-blob", blob }]);
  });
});
