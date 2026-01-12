import type { CardRecord } from "@/types/cards-db";

import { deleteCard, getCard } from "@/lib/cards-db";
import { installMockIndexedDbCards } from "@/lib/__testutils__/mockIndexedDbCards";

describe("deleteCard", () => {
  it("deletes a card", async () => {
    const existing: CardRecord = {
      id: "c1",
      templateId: "hero",
      status: "saved",
      name: "Name",
      nameLower: "name",
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    };
    const harness = installMockIndexedDbCards({ hasCardsStore: true, initialCards: [existing] });

    await deleteCard("c1");
    expect(harness.cardsStore.delete).toHaveBeenCalledWith("c1");
    await expect(getCard("c1")).resolves.toBeNull();
    harness.cleanup();
  });

  it("rejects when store.delete fails", async () => {
    const harness = installMockIndexedDbCards({ hasCardsStore: true });
    harness.cardsStore.failNext("delete", new Error("delete-failed"));
    await expect(deleteCard("c1")).rejects.toThrow("delete-failed");
    harness.cleanup();
  });

  it("rejects with a default error when store.delete fails without request.error", async () => {
    const harness = installMockIndexedDbCards({ hasCardsStore: true });
    harness.cardsStore.failNext("delete", undefined);
    await expect(deleteCard("c1")).rejects.toThrow("Failed to delete card");
    harness.cleanup();
  });
});

