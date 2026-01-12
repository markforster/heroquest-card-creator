import type { CardRecord } from "@/types/cards-db";

import { getCard } from "@/lib/cards-db";
import { installMockIndexedDbCards } from "@/lib/__testutils__/mockIndexedDbCards";

describe("getCard", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns null when missing", async () => {
    const harness = installMockIndexedDbCards({ hasCardsStore: true });
    await expect(getCard("missing")).resolves.toBeNull();
    harness.cleanup();
  });

  it("returns the card when present", async () => {
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
    await expect(getCard("c1")).resolves.toEqual(existing);
    harness.cleanup();
  });

  it("rejects when store.get fails", async () => {
    const harness = installMockIndexedDbCards({ hasCardsStore: true });
    harness.cardsStore.failNext("get", new Error("get-failed"));
    await expect(getCard("c1")).rejects.toThrow("get-failed");
    harness.cleanup();
  });

  it("rejects with a default error when store.get fails without request.error", async () => {
    const harness = installMockIndexedDbCards({ hasCardsStore: true });
    harness.cardsStore.failNext("get", undefined);
    await expect(getCard("c1")).rejects.toThrow("Failed to load card");
    harness.cleanup();
  });
});

