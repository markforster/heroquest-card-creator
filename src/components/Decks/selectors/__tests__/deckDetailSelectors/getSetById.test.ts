import type { DeckSetRecord } from "@/api/decks";
import { getSetById } from "@/components/Decks/selectors/deckDetailSelectors";

describe("getSetById", () => {
  it("indexes sets by identifier", () => {
    const first = { id: "set-1" } as DeckSetRecord;
    const second = { id: "set-2" } as DeckSetRecord;

    expect(getSetById([first, second])).toEqual(
      new Map([
        ["set-1", first],
        ["set-2", second],
      ]),
    );
  });
});
