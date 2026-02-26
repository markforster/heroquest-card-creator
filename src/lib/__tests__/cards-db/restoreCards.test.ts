import type { CardRecord } from "@/types/cards-db";

import { listCards, restoreCards } from "@/lib/cards-db";
import { installMockIndexedDbCards } from "@/lib/__testutils__/mockIndexedDbCards";

function card(
  partial: Partial<CardRecord> &
    Pick<CardRecord, "id" | "templateId" | "status" | "name" | "nameLower">,
): CardRecord {
  return {
    createdAt: 1,
    updatedAt: 1,
    schemaVersion: 1,
    ...partial,
  };
}

describe("restoreCards", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("clears deletedAt and includes the card in listCards default results again", async () => {
    jest.spyOn(Date, "now").mockReturnValue(200);
    const existing = card({
      id: "c1",
      templateId: "hero",
      status: "saved",
      name: "Card",
      nameLower: "card",
      deletedAt: 123,
    });
    const harness = installMockIndexedDbCards({
      hasCardsStore: true,
      initialCards: [existing],
      indexNames: [],
    });

    // Sanity: excluded by default while deleted.
    await expect(listCards()).resolves.toEqual([]);

    await restoreCards(["c1"]);

    expect(harness.cardsStore.put).toHaveBeenCalledWith({
      ...existing,
      deletedAt: null,
      updatedAt: 200,
    });

    const restored = await listCards();
    expect(restored.map((r) => r.id)).toEqual(["c1"]);

    harness.cleanup();
  });
});

