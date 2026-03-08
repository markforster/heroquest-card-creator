import { installMockIndexedDbCards } from "@/lib/__testutils__/mockIndexedDbCards";
import { listCards, softDeleteCards } from "@/lib/cards-db";
import type { CardRecord } from "@/types/cards-db";


describe("softDeleteCards", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("marks cards as deleted with deletedAt and excludes them from listCards by default", async () => {
    jest.spyOn(Date, "now").mockReturnValue(200);
    const existing: CardRecord = {
      id: "c1",
      templateId: "hero",
      status: "saved",
      name: "Card",
      nameLower: "card",
      createdAt: 100,
      updatedAt: 100,
      schemaVersion: 1,
    };
    const harness = installMockIndexedDbCards({ hasCardsStore: true, initialCards: [existing] });

    await softDeleteCards(["c1"], 123);

    expect(harness.cardsStore.put).toHaveBeenCalledWith({
      ...existing,
      deletedAt: 123,
      updatedAt: 200,
    });

    const defaultList = await listCards({ deleted: "exclude" });
    expect(defaultList).toHaveLength(0);

    const deletedOnly = await listCards({ deleted: "only" });
    expect(deletedOnly.map((r) => r.id)).toEqual(["c1"]);

    harness.cleanup();
  });
});

