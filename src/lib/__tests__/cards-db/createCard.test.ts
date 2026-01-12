import type { CardRecord } from "@/types/cards-db";

import { createCard, getCard } from "@/lib/cards-db";
import { installMockIndexedDbCards } from "@/lib/__testutils__/mockIndexedDbCards";

describe("createCard", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates a card with timestamps, schemaVersion and nameLower", async () => {
    jest.spyOn(Date, "now").mockReturnValue(100);
    const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { randomUUID: () => "card-1" },
    });

    const harness = installMockIndexedDbCards({ hasCardsStore: true });

    const created = await createCard({
      templateId: "hero",
      status: "saved",
      name: "My HERO",
      title: "Title",
    });

    expect(created).toEqual<CardRecord>({
      templateId: "hero",
      status: "saved",
      name: "My HERO",
      title: "Title",
      id: "card-1",
      createdAt: 100,
      updatedAt: 100,
      nameLower: "my hero",
      schemaVersion: 1,
      description: undefined,
      imageAssetId: undefined,
      imageAssetName: undefined,
      imageScale: undefined,
      imageOffsetX: undefined,
      imageOffsetY: undefined,
      imageOriginalWidth: undefined,
      imageOriginalHeight: undefined,
      heroAttackDice: undefined,
      heroDefendDice: undefined,
      heroBodyPoints: undefined,
      heroMindPoints: undefined,
      monsterMovementSquares: undefined,
      monsterAttackDice: undefined,
      monsterDefendDice: undefined,
      monsterBodyPoints: undefined,
      monsterMindPoints: undefined,
      monsterIconAssetId: undefined,
      monsterIconAssetName: undefined,
      thumbnailBlob: undefined,
    });

    expect(harness.cardsStore.add).toHaveBeenCalledWith(created);
    await expect(getCard("card-1")).resolves.toEqual(created);

    harness.cleanup();
    if (originalCrypto) Object.defineProperty(globalThis, "crypto", originalCrypto);
  });

  it("rejects when store.add fails with request.error", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1);
    const harness = installMockIndexedDbCards({ hasCardsStore: true });
    harness.cardsStore.failNext("add", new Error("add-failed"));

    await expect(
      createCard({ templateId: "hero", status: "saved", name: "X" }),
    ).rejects.toThrow("add-failed");

    harness.cleanup();
  });

  it("rejects with a default error when store.add fails without request.error", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1);
    const harness = installMockIndexedDbCards({ hasCardsStore: true });
    harness.cardsStore.failNext("add", undefined);

    await expect(
      createCard({ templateId: "hero", status: "saved", name: "X" }),
    ).rejects.toThrow("Failed to create card");

    harness.cleanup();
  });
});

