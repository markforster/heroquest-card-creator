import type { DeckSetRecord } from "@/api/decks";
import { getGroupBySetId } from "@/components/Decks/selectors/deckDetailSelectors";

describe("getGroupBySetId", () => {
  it("indexes each set's group identifier", () => {
    const sets = [
      { id: "set-1", groupId: "group-1" },
      { id: "set-2", groupId: "group-2" },
    ] as DeckSetRecord[];

    expect(getGroupBySetId(sets)).toEqual(
      new Map([
        ["set-1", "group-1"],
        ["set-2", "group-2"],
      ]),
    );
  });
});
