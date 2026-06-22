import { getCardRequestPlugin } from "@/api/local/getCardRequest";
import { cardRecordToCardData } from "@/lib/card-record-mapper";
import { getCard } from "@/lib/cards-db";
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
import type { CardRecord } from "@/types/cards-db";

describe("getCard", () => {
  beforeEach(() => {
    installFakeIndexedDb();
  });

  afterEach(async () => {
    try {
      getHqccDexieDb().close();
    } catch {}
    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
    jest.restoreAllMocks();
  });

  it("returns null when the card is missing", async () => {
    await expect(getCard("missing")).resolves.toBeNull();
  });

  it("returns the card when present", async () => {
    await seedNormalizedCard(createCardRecord({ id: "c1" }));

    await expect(getCard("c1")).resolves.toEqual(expect.objectContaining(createCardRecord({ id: "c1" })));
  });

  it("normalizes a thumbnail blob with no type and schedules repair", async () => {
    await seedNormalizedCard(createCardRecord({ id: "c1" }));
    await seedNormalizedThumbnail({ cardId: "c1", thumbnailBlob: new Blob(["x"]) });

    const card = await getCard("c1");
    expect(card?.thumbnailBlob?.type).toBe("image/png");
  });

  it("assembles a hero card from normalized rows", async () => {
    const heroRecord = createCardRecord({
      id: "hero-1",
      templateId: "hero",
      title: "Sir Ragnar",
      backgroundTint: "#d8c9a4",
      imageAssetId: "hero-art",
      imageAssetName: "Hero Art",
      heroAttackDice: [3, 0, 0],
      heroDefendDice: [2, 0, 0],
      heroBodyPoints: [8, 0, 0],
      heroMindPoints: [3, 0, 0],
    });

    await seedNormalizedCard(heroRecord);

    await expect(getCard("hero-1")).resolves.toEqual(
      expect.objectContaining({
        id: "hero-1",
        templateId: "hero",
        title: "Sir Ragnar",
        backgroundTint: "#d8c9a4",
        imageAssetId: "hero-art",
        heroAttackDice: [3, 0, 0],
        heroMindPoints: [3, 0, 0],
        schemaVersion: 2,
      }),
    );
  });

  it("assembles a monster card from normalized rows and preserves mapper compatibility", async () => {
    const monsterRecord = createCardRecord({
      id: "monster-1",
      templateId: "monster",
      title: "Goblin",
      description: "A sneaky foe",
      bodyTextColor: "#101010",
      bodyTextFitToBounds: true,
      imageAssetId: "monster-art",
      imageAssetName: "Monster Art",
      monsterMovementSquares: [8, 0, 0],
      monsterAttackDice: [2, 0, 0],
      monsterDefendDice: [1, 0, 0],
      monsterBodyPoints: [1, 0, 0],
      monsterMindPoints: [1, 0, 0],
      monsterIconAssetId: "monster-icon",
      monsterIconAssetName: "Monster Icon",
      monsterIconOffsetX: 5,
      monsterIconOffsetY: -2,
      monsterIconScale: 1.4,
      monsterIconRotation: 8,
    });

    await seedNormalizedCard(monsterRecord);

    const card = await getCard("monster-1");

    expect(card).toEqual(
      expect.objectContaining({
        templateId: "monster",
        description: "A sneaky foe",
        monsterAttackDice: [2, 0, 0],
        monsterIconAssetId: "monster-icon",
        monsterIconScale: 1.4,
      }),
    );

    const mapped = cardRecordToCardData(card as CardRecord & { templateId: "monster" });
    expect(mapped).toEqual(
      expect.objectContaining({
        description: "A sneaky foe",
        bodyTextColor: "#101010",
        bodyTextFitToBounds: true,
        iconAssetId: "monster-icon",
        iconScale: 1.4,
        attackDice: [2, 0, 0],
      }),
    );
  });

  it("assembles a labelled-back card from normalized rows", async () => {
    const labelledBackRecord = createCardRecord({
      id: "back-1",
      templateId: "labelled-back",
      title: "Treasure Deck",
      titlePlacement: "top",
      titleStyle: "plain",
      description: "Back card body",
      bodyTextStyle: {
        enabled: true,
        backdrop: {
          enabled: true,
          color: "#ffffff",
          opacity: 0.7,
          insetMode: "matchBorder",
          cornerMode: "opposite-title",
          fitMode: "full",
        },
      },
      borderColor: "#7a4a21",
      backgroundTint: "#e9e0cf",
    });

    await seedNormalizedCard(labelledBackRecord);

    await expect(getCard("back-1")).resolves.toEqual(
      expect.objectContaining({
        templateId: "labelled-back",
        title: "Treasure Deck",
        titlePlacement: "top",
        titleStyle: "plain",
        description: "Back card body",
        borderColor: "#7a4a21",
        backgroundTint: "#e9e0cf",
        bodyTextStyle: expect.objectContaining({
          enabled: true,
          backdrop: expect.objectContaining({
            enabled: true,
            color: "#ffffff",
            opacity: 0.7,
          }),
        }),
      }),
    );
  });

  it("returns null when normalized rows are absent", async () => {
    await expect(getCard("legacy-only")).resolves.toBeNull();
  });

  it("returns null when normalized rows are incomplete", async () => {
    const db = await openHqccDexieDb();
    const record = createCardRecord({
      id: "fallback-1",
      templateId: "monster",
      title: "Fallback Goblin",
      monsterIconAssetId: "legacy-icon",
    });
    await seedNormalizedCard(record);
    await db.cardIconComponents.delete("fallback-1:hq.2021.icon.monster.primary");

    await expect(getCard("fallback-1")).resolves.toBeNull();
  });

  it("keeps the local getCard request response shape unchanged", async () => {
    const record = createCardRecord({
      id: "api-card-1",
      templateId: "hero",
      title: "Api Hero",
    });
    await seedNormalizedCard(record);
    await seedNormalizedThumbnail({
      cardId: "api-card-1",
      thumbnailBlob: new Blob(["x"], { type: "image/png" }),
    });

    const resolved = await getCardRequestPlugin.request?.([], { params: { id: "api-card-1" } } as never);
    const adapter = resolved?.adapter as (() => Promise<any>) | undefined;
    const response = await adapter?.();

    expect(response?.status).toBe(200);
    expect(response?.data).toEqual(
      expect.objectContaining({
        id: "api-card-1",
        templateId: "hero",
        title: "Api Hero",
      }),
    );
    expect(response?.data).not.toHaveProperty("thumbnailBlob");
  });
});
