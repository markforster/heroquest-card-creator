import type { CardRecord } from "@/types/cards-db";

import { deleteCards, getCard } from "@/lib/cards-db";
import { installMockIndexedDbCards } from "@/lib/__testutils__/mockIndexedDbCards";

async function flushMicrotasks() {
  for (let i = 0; i < 6; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
}

describe("deleteCards", () => {
  it("returns early when ids is empty", async () => {
    const harness = installMockIndexedDbCards({ hasCardsStore: true });
    await deleteCards([]);
    expect(harness.open).not.toHaveBeenCalled();
    harness.cleanup();
  });

  it("deletes multiple cards and resolves on tx.oncomplete", async () => {
    const existing: CardRecord[] = [
      { id: "a", templateId: "hero", status: "saved", name: "A", nameLower: "a", createdAt: 1, updatedAt: 1, schemaVersion: 1 },
      { id: "b", templateId: "hero", status: "saved", name: "B", nameLower: "b", createdAt: 1, updatedAt: 1, schemaVersion: 1 },
    ];
    const harness = installMockIndexedDbCards({ hasCardsStore: true, initialCards: existing });

    const promise = deleteCards(["a", "b"]);
    await flushMicrotasks();

    expect(harness.open).toHaveBeenCalled();
    expect(harness.cardsStore.delete).toHaveBeenCalledWith("a");
    expect(harness.cardsStore.delete).toHaveBeenCalledWith("b");

    harness.cardsStore.completeTransaction();
    await expect(promise).resolves.toBeUndefined();

    await expect(getCard("a")).resolves.toBeNull();
    await expect(getCard("b")).resolves.toBeNull();

    harness.cleanup();
  });

  it("rejects when tx.onerror fires with tx.error", async () => {
    const harness = installMockIndexedDbCards({ hasCardsStore: true });

    const promise = deleteCards(["a"]);
    await flushMicrotasks();

    harness.cardsStore.transaction.error = new Error("tx-failed");
    harness.cardsStore.transaction.onerror?.();

    await expect(promise).rejects.toThrow("tx-failed");
    harness.cleanup();
  });

  it("rejects with a default error when tx.onerror fires without tx.error", async () => {
    const harness = installMockIndexedDbCards({ hasCardsStore: true });

    const promise = deleteCards(["a"]);
    await flushMicrotasks();

    harness.cardsStore.transaction.error = undefined;
    harness.cardsStore.transaction.onerror?.();

    await expect(promise).rejects.toThrow("Failed to delete cards");
    harness.cleanup();
  });
});
