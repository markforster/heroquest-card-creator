const listCardDeckMembership = jest.fn();

jest.mock("@/lib/data/decks-service", () => ({
  listCardDeckMembership: (...args: unknown[]) => listCardDeckMembership(...args),
}));

import { listCardDecksRequestPlugin } from "@/api/local/listCardDecksRequest";

async function runAdapter(config: Record<string, unknown>) {
  const request = listCardDecksRequestPlugin.request;
  if (!request) {
    throw new Error("Expected listCardDecksRequestPlugin.request");
  }

  const resolved = await request([], config as never);
  if (typeof resolved.adapter !== "function") {
    throw new Error("Expected listCardDecksRequestPlugin to provide an adapter");
  }

  return resolved.adapter({} as never);
}

describe("listCardDecksRequestPlugin", () => {
  beforeEach(() => {
    listCardDeckMembership.mockReset();
  });

  it("throws when id param is missing", async () => {
    await expect(runAdapter({})).rejects.toThrow("[api:listCardDecks] Missing id");
  });

  it("returns deck membership from service", async () => {
    listCardDeckMembership.mockResolvedValue([{ deckId: "d1", deckTitle: "Deck One", count: 3 }]);

    const response = await runAdapter({
      params: { id: "card-1" },
    });

    expect(listCardDeckMembership).toHaveBeenCalledWith("card-1");
    expect(response?.status).toBe(200);
    expect(response?.data).toEqual([{ deckId: "d1", deckTitle: "Deck One", count: 3 }]);
    expect(response?.headers?.["x-hqcc-source"]).toBe("indexeddb");
  });
});
