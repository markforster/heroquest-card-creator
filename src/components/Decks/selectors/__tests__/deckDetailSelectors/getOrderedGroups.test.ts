import type { DeckGroupRecord } from "@/api/decks";
import { getOrderedGroups } from "@/components/Decks/selectors/deckDetailSelectors";

describe("getOrderedGroups", () => {
  it("returns a sorted copy without mutating the source", () => {
    const source = [
      { id: "second", sortIndex: 2 },
      { id: "first", sortIndex: 1 },
    ] as DeckGroupRecord[];

    expect(getOrderedGroups(source).map((group) => group.id)).toEqual(["first", "second"]);
    expect(source.map((group) => group.id)).toEqual(["second", "first"]);
  });
});
