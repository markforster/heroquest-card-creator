const listCardDeckMembership = jest.fn();

jest.mock("@/lib/decks-service", () => ({
  listCardDeckMembership: (...args: unknown[]) => listCardDeckMembership(...args),
}));

import { listCardDecksRequestPlugin } from "@/api/local/listCardDecksRequest";

describe("listCardDecksRequestPlugin", () => {
  beforeEach(() => {
    listCardDeckMembership.mockReset();
  });

  it("throws when id param is missing", async () => {
    const resolved = await listCardDecksRequestPlugin.request?.([], {} as never);
    const adapter = resolved?.adapter as (() => Promise<unknown>) | undefined;
    await expect(adapter?.()).rejects.toThrow("[api:listCardDecks] Missing id");
  });

  it("returns deck membership from service", async () => {
    listCardDeckMembership.mockResolvedValue([{ deckId: "d1", deckTitle: "Deck One", count: 3 }]);

    const resolved = await listCardDecksRequestPlugin.request?.([], { params: { id: "card-1" } } as never);
    const adapter = resolved?.adapter as (() => Promise<any>) | undefined;
    const response = await adapter?.();

    expect(listCardDeckMembership).toHaveBeenCalledWith("card-1");
    expect(response?.status).toBe(200);
    expect(response?.data).toEqual([{ deckId: "d1", deckTitle: "Deck One", count: 3 }]);
    expect(response?.headers?.["x-hqcc-source"]).toBe("indexeddb");
  });
});
