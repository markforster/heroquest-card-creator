import { resetLibraryData } from "@/lib/data/library-reset";
import { getHqccDexieDb, META_APP_VERSION_KEY, openHqccDexieDb } from "@/lib/db/hqcc-dexie";
import {
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/cards-db-test-helpers";

const componentBase = {
  cardId: "card-1",
  order: 0,
  createdAt: 1,
  updatedAt: 1,
  schemaVersion: 1,
} as const;

describe("resetLibraryData", () => {
  beforeEach(() => {
    installFakeIndexedDb();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(async () => {
    try {
      getHqccDexieDb().close();
    } catch {}
    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
    jest.restoreAllMocks();
  });

  it("clears library-owned stores and preserves settings and meta", async () => {
    const db = await openHqccDexieDb();

    await db.cardsBase.put({
      id: "card-1",
      templateId: "hero",
      systemFamily: "hq.2021",
      status: "saved",
      name: "Card",
      nameLower: "card",
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    });
    await db.cardThumbnails.put({
      id: "thumb-1",
      cardId: "card-1",
      thumbnailBlob: new Blob(["thumb"], { type: "image/png" }),
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    });
    await db.cardSlotLinks.put({
      id: "slot-1",
      cardId: "card-1",
      slotId: "hq.2021.title.main",
      slotType: "title",
      dataRecordId: "title-1",
      order: 0,
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    });
    await db.cardBackgroundComponents.put({
      ...componentBase,
      id: "background-1",
      slotId: "hq.2021.background.base",
    });
    await db.cardBorderComponents.put({
      ...componentBase,
      id: "border-1",
      slotId: "hq.2021.border.frame",
    });
    await db.cardTitleComponents.put({
      ...componentBase,
      id: "title-1",
      slotId: "hq.2021.title.main",
      title: "Card",
    });
    await db.cardTextComponents.put({
      ...componentBase,
      id: "text-1",
      slotId: "hq.2021.text.body",
      text: "Body",
    });
    await db.cardCopyrightComponents.put({
      ...componentBase,
      id: "copyright-1",
      slotId: "hq.2021.text.copyright",
      text: "Copyright",
    });
    await db.cardImageComponents.put({
      ...componentBase,
      id: "image-1",
      slotId: "hq.2021.image.main",
      assetId: "asset-1",
    });
    await db.cardHeroBackLogoComponents.put({
      ...componentBase,
      id: "hero-back-logo-component-1",
      slotId: "hq.2021.logo.hero-back",
      mode: "custom",
      logoId: "logo-1",
    });
    await db.cardIconComponents.put({
      ...componentBase,
      id: "icon-1",
      slotId: "hq.2021.icon.monster.primary",
      assetId: "asset-1",
    });
    await db.cardHeroStatsComponents.put({
      ...componentBase,
      id: "hero-stats-1",
      slotId: "hq.2021.stats.hero.primary",
      attackDice: 2,
    });
    await db.cardMonsterStatsComponents.put({
      ...componentBase,
      id: "monster-stats-1",
      slotId: "hq.2021.stats.monster.primary",
      attackDice: 2,
    });
    await db.pairs.put({
      id: "pair-1",
      name: "Pair",
      nameLower: "pair",
      frontFaceId: "card-1",
      backFaceId: "card-2",
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    });
    await db.table("assets").put({
      id: "asset-1",
      name: "Asset",
      mimeType: "image/png",
      width: 10,
      height: 10,
      createdAt: 1,
      blob: new Blob(["asset"], { type: "image/png" }),
    });
    await db.table("heroBackLogos").put({
      id: "logo-1",
      name: "Logo",
      mimeType: "image/png",
      width: 10,
      height: 10,
      createdAt: 1,
      updatedAt: 1,
      blob: new Blob(["logo"], { type: "image/png" }),
    });
    await db.collections.put({
      id: "collection-1",
      name: "Collection",
      cardIds: ["card-1"],
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    });
    await db.decks.put({
      id: "deck-1",
      title: "Deck",
      description: null,
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    });
    await db.deckGroups.put({
      id: "group-1",
      deckId: "deck-1",
      sortIndex: 0,
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    });
    await db.deckSets.put({
      id: "set-1",
      deckId: "deck-1",
      groupId: "group-1",
      description: null,
      backFaceId: "card-2",
      sortIndex: 0,
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    });
    await db.deckEntries.put({
      id: "entry-1",
      deckId: "deck-1",
      setId: "set-1",
      pairId: "pair-1",
      sortIndex: 0,
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    });
    await db.settings.put({
      id: "defaultCopyright",
      value: "Copyright",
      updatedAt: 1,
      schemaVersion: 1,
    });
    await db.meta.put({
      id: META_APP_VERSION_KEY,
      value: "0.0.0-test",
      dbVersion: 11,
      updatedAt: 1,
    });

    window.localStorage.setItem("hqcc.activeCards.v1", "active");
    window.localStorage.setItem("hqcc.selectedCollectionId", "collection-1");
    window.localStorage.setItem("hqcc.draft.v1", "draft");
    window.localStorage.setItem("hqcc.draftTemplateId.v1", "hero");
    window.localStorage.setItem("hqcc.draftSourceCardId.v1", "card-1");
    window.localStorage.setItem("hqcc.cardDrafts.v1", "legacy");
    window.localStorage.setItem("hqcc.collectionsTreeExpanded", "[]");
    window.localStorage.setItem("hqcc.dbEstimate.queue.v1", "[]");
    window.localStorage.setItem("hqcc.theme", "dark");
    window.localStorage.setItem("hqcc.selectedTemplateId", "hero");
    window.sessionStorage.setItem("hqcc.initialLoadCompleted", "1");

    const summary = await resetLibraryData();

    expect(summary).toEqual({
      cards: 1,
      cardThumbnails: 1,
      cardComponents: 11,
      pairs: 1,
      assets: 1,
      heroBackLogos: 1,
      collections: 1,
      decks: 1,
      deckGroups: 1,
      deckSets: 1,
      deckEntries: 1,
      totalLibraryRecords: 21,
      isEmpty: false,
    });

    await expect(db.cardsBase.count()).resolves.toBe(0);
    await expect(db.cardThumbnails.count()).resolves.toBe(0);
    await expect(db.cardSlotLinks.count()).resolves.toBe(0);
    await expect(db.cardBackgroundComponents.count()).resolves.toBe(0);
    await expect(db.cardBorderComponents.count()).resolves.toBe(0);
    await expect(db.cardTitleComponents.count()).resolves.toBe(0);
    await expect(db.cardTextComponents.count()).resolves.toBe(0);
    await expect(db.cardCopyrightComponents.count()).resolves.toBe(0);
    await expect(db.cardImageComponents.count()).resolves.toBe(0);
    await expect(db.cardHeroBackLogoComponents.count()).resolves.toBe(0);
    await expect(db.cardIconComponents.count()).resolves.toBe(0);
    await expect(db.cardHeroStatsComponents.count()).resolves.toBe(0);
    await expect(db.cardMonsterStatsComponents.count()).resolves.toBe(0);
    await expect(db.pairs.count()).resolves.toBe(0);
    await expect(db.assets.count()).resolves.toBe(0);
    await expect(db.heroBackLogos.count()).resolves.toBe(0);
    await expect(db.collections.count()).resolves.toBe(0);
    await expect(db.decks.count()).resolves.toBe(0);
    await expect(db.deckGroups.count()).resolves.toBe(0);
    await expect(db.deckSets.count()).resolves.toBe(0);
    await expect(db.deckEntries.count()).resolves.toBe(0);
    await expect(db.settings.get("defaultCopyright")).resolves.toEqual({
      id: "defaultCopyright",
      value: "Copyright",
      updatedAt: 1,
      schemaVersion: 1,
    });
    await expect(db.meta.get(META_APP_VERSION_KEY)).resolves.toEqual({
      id: META_APP_VERSION_KEY,
      value: "0.0.0-test",
      dbVersion: 11,
      updatedAt: 1,
    });

    expect(window.localStorage.getItem("hqcc.activeCards.v1")).toBeNull();
    expect(window.localStorage.getItem("hqcc.selectedCollectionId")).toBeNull();
    expect(window.localStorage.getItem("hqcc.draft.v1")).toBeNull();
    expect(window.localStorage.getItem("hqcc.draftTemplateId.v1")).toBeNull();
    expect(window.localStorage.getItem("hqcc.draftSourceCardId.v1")).toBeNull();
    expect(window.localStorage.getItem("hqcc.cardDrafts.v1")).toBeNull();
    expect(window.localStorage.getItem("hqcc.collectionsTreeExpanded")).toBeNull();
    expect(window.localStorage.getItem("hqcc.dbEstimate.queue.v1")).toBeNull();
    expect(window.localStorage.getItem("hqcc.theme")).toBe("dark");
    expect(window.localStorage.getItem("hqcc.selectedTemplateId")).toBe("hero");
    expect(window.sessionStorage.getItem("hqcc.initialLoadCompleted")).toBeNull();
  });
});
