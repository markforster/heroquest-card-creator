import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { getPairedFaceIds } from "@/lib/pairs-service";

import {
  createPairRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/pairs-service-test-helpers";

jest.mock("@/lib/cards-db", () => ({
  getCard: jest.fn(async () => null),
}));

describe("getPairedFaceIds", () => {
  beforeEach(() => {
    jest.resetModules();
    installFakeIndexedDb();
  });

  afterEach(async () => {
    try {
      getHqccDexieDb().close();
    } catch {
      // Ignore teardown failures if the DB module was not opened.
    }

    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it("returns deduped opposite face ids only", async () => {
    const db = await openHqccDexieDb();
    await db.pairs.bulkPut([
      createPairRecord({ id: "pair-1", frontFaceId: "face-1", backFaceId: "back-1" }),
      createPairRecord({ id: "pair-2", frontFaceId: "front-2", backFaceId: "face-1" }),
      createPairRecord({ id: "pair-3", frontFaceId: "face-1", backFaceId: "back-1" }),
    ]);

    await expect(getPairedFaceIds("face-1")).resolves.toEqual(
      expect.arrayContaining(["back-1", "front-2"]),
    );
  });
});
