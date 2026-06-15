import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { listPairsForFace } from "@/lib/pairs-service";

import {
  createPairRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/pairs-service-test-helpers";

jest.mock("@/lib/cards-db", () => ({
  getCard: jest.fn(async () => null),
}));

describe("listPairsForFace", () => {
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

  it("returns front and back matches for the face", async () => {
    const db = await openHqccDexieDb();
    await db.pairs.bulkPut([
      createPairRecord({ id: "pair-1", frontFaceId: "face-1", backFaceId: "back-1" }),
      createPairRecord({ id: "pair-2", frontFaceId: "front-2", backFaceId: "face-1" }),
      createPairRecord({ id: "pair-3", frontFaceId: "front-3", backFaceId: "back-3" }),
    ]);

    await expect(listPairsForFace("face-1")).resolves.toEqual([
      expect.objectContaining({ id: "pair-1" }),
      expect.objectContaining({ id: "pair-2" }),
    ]);
  });

  it("returns an empty array when no stored pairs match", async () => {
    const db = await openHqccDexieDb();
    await db.pairs.put(createPairRecord({ id: "pair-1", frontFaceId: "front-1", backFaceId: "back-1" }));

    await expect(listPairsForFace("missing-face")).resolves.toEqual([]);
  });
});
