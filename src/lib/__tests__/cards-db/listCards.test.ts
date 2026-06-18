import { listCardsRequestPlugin } from "@/api/local/listCardsRequest";
import { listCards } from "@/lib/cards-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import {
  seedNormalizedCard,
  seedNormalizedThumbnail,
} from "@/lib/test-support/normalized-card-test-helpers";

import {
  createCardRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/cards-db-test-helpers";

describe("listCards", () => {
  beforeEach(async () => {
    installFakeIndexedDb();
    try {
      getHqccDexieDb().close();
    } catch {}
    await deleteDb("hqcc").catch(() => {});
  });

  afterEach(async () => {
    try {
      getHqccDexieDb().close();
    } catch {}
    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
    jest.restoreAllMocks();
  });

  it("excludes soft-deleted cards by default", async () => {
    await seedNormalizedCard(createCardRecord({ id: "1", name: "A", nameLower: "a" }));
    await seedNormalizedCard(createCardRecord({ id: "2", name: "B", nameLower: "b", deletedAt: 123 }));

    const result = await listCards();
    expect(result.map((r) => r.id)).toEqual(["1"]);
  });

  it("can include or isolate soft-deleted cards", async () => {
    await seedNormalizedCard(createCardRecord({ id: "1", name: "A", nameLower: "a" }));
    await seedNormalizedCard(createCardRecord({ id: "2", name: "B", nameLower: "b", deletedAt: 123 }));

    await expect(listCards({ deleted: "include" })).resolves.toHaveLength(2);
    await expect(listCards({ deleted: "only" })).resolves.toEqual([
      expect.objectContaining({ id: "2" }),
    ]);
  });

  it("filters by templateId, status, and search via scan and filter", async () => {
    await seedNormalizedCard(
      createCardRecord({ id: "1", templateId: "hero", status: "saved", name: "Hello", nameLower: "hello" }),
    );
    await seedNormalizedCard(
      createCardRecord({ id: "2", templateId: "hero", status: "draft", name: "World", nameLower: "world" }),
    );
    await seedNormalizedCard(
      createCardRecord({ id: "3", templateId: "monster", status: "saved", name: "Other", nameLower: "other" }),
    );

    await expect(listCards({ templateId: "hero", status: "saved" })).resolves.toEqual([
      expect.objectContaining({ id: "1" }),
    ]);
    await expect(listCards({ search: "HELL" })).resolves.toEqual([
      expect.objectContaining({ id: "1" }),
    ]);
  });

  it("returns normalized-backed summaries when cardsBase rows exist", async () => {
    await seedNormalizedCard(
      createCardRecord({
        id: "summary-hero-1",
        templateId: "hero",
        name: "Sir Ragnar",
        nameLower: "sir ragnar",
      }),
    );

    await expect(listCards({ search: "sir ragnar" })).resolves.toEqual([
      expect.objectContaining({
        id: "summary-hero-1",
        templateId: "hero",
        name: "Sir Ragnar",
        nameLower: "sir ragnar",
        schemaVersion: 2,
      }),
    ]);
  });

  it("reflects normalized rows only", async () => {
    await seedNormalizedCard(
      createCardRecord({
        id: "normalized-win-1",
        templateId: "hero",
        name: "Normalized Name",
        nameLower: "normalized name",
      }),
    );

    await expect(listCards({ search: "normalized name" })).resolves.toEqual([
      expect.objectContaining({
        id: "normalized-win-1",
        templateId: "hero",
        name: "Normalized Name",
        nameLower: "normalized name",
      }),
    ]);
  });

  it("does not include legacy-only rows", async () => {
    await expect(listCards({ search: "legacy card" })).resolves.toEqual([]);
  });

  it("carries normalized thumbnails onto list results", async () => {
    const thumbnailBlob = new Blob(["x"]);
    await seedNormalizedCard(createCardRecord({ id: "thumb-hero-1", name: "Thumb Hero", nameLower: "thumb hero" }));
    await seedNormalizedThumbnail({ cardId: "thumb-hero-1", thumbnailBlob });

    const [card] = await listCards({ search: "thumb hero" });
    expect(card.thumbnailBlob?.type).toBe("image/png");
  });

  it("lists normalized-backed cards even when the legacy row is missing", async () => {
    await seedNormalizedCard(
      createCardRecord({
        id: "summary-only-1",
        templateId: "hero",
        name: "Summary Only",
        nameLower: "summary only",
      }),
    );

    await expect(listCards({ search: "summary only" })).resolves.toEqual([
      expect.objectContaining({
        id: "summary-only-1",
        name: "Summary Only",
        thumbnailBlob: undefined,
      }),
    ]);
  });

  it("keeps the local API listCards response shape unchanged", async () => {
    await seedNormalizedCard(
      createCardRecord({ id: "api-hero-1", templateId: "hero", name: "Api Hero", nameLower: "api hero" }),
    );

    const resolved = await listCardsRequestPlugin.request?.([], { queries: { search: "api hero" } } as never);
    const adapter = resolved?.adapter as (() => Promise<any>) | undefined;
    const response = await adapter?.();

    expect(response?.status).toBe(200);
    expect(response?.data).toEqual([
      expect.objectContaining({
        id: "api-hero-1",
        templateId: "hero",
        name: "Api Hero",
      }),
    ]);
    expect(response?.data[0]).not.toHaveProperty("thumbnailBlob");
  });
});
