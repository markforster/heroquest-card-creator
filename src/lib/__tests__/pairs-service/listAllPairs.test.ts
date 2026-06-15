import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { listAllPairs } from "@/lib/pairs-service";

import {
  createPairRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/pairs-service-test-helpers";

jest.mock("@/lib/cards-db", () => ({
  getCard: jest.fn(async () => null),
}));

describe("listAllPairs", () => {
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

  it("returns all stored pairs", async () => {
    const db = await openHqccDexieDb();
    await db.pairs.bulkPut([
      createPairRecord({ id: "pair-1" }),
      createPairRecord({ id: "pair-2", frontFaceId: "front-2", backFaceId: "back-2" }),
    ]);

    await expect(listAllPairs()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "pair-1" }),
        expect.objectContaining({ id: "pair-2" }),
      ]),
    );
  });
});
