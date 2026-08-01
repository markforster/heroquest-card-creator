const getCard = jest.fn();

jest.mock("@/api/client", () => ({
  apiClient: { getCard: (...args: unknown[]) => getCard(...args) },
}));

import type { CardRecord } from "@/api/cards";
import { hydrateCardsForExport } from "@/components/Stockpile/stockpile-export";

const card = (id: string) => ({ id }) as CardRecord;

describe("hydrateCardsForExport", () => {
  beforeEach(() => getCard.mockReset());

  it("returns early for an empty selection", async () => {
    await expect(hydrateCardsForExport([])).resolves.toEqual([]);
    expect(getCard).not.toHaveBeenCalled();
  });

  it("hydrates cards and omits missing or failed records", async () => {
    getCard.mockImplementation(({ params }: { params: { id: string } }) => {
      if (params.id === "one") return Promise.resolve(card("one-full"));
      if (params.id === "two") return Promise.resolve(null);
      return Promise.reject(new Error("failed"));
    });

    await expect(hydrateCardsForExport([card("one"), card("two"), card("three")])).resolves.toEqual(
      [card("one-full")],
    );
  });
});
