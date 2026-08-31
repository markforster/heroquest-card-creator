import type { DeckSetRecord } from "@/api/decks";
import { getSelectedGroupSets } from "@/components/Decks/selectors/deckDetailSelectors";

describe("getSelectedGroupSets", () => {
  it("filters and sorts sets for the selected group", () => {
    const sets = [
      { id: "second", groupId: "group-1", sortIndex: 2 },
      { id: "other", groupId: "group-2", sortIndex: 0 },
      { id: "first", groupId: "group-1", sortIndex: 1 },
    ] as DeckSetRecord[];

    expect(getSelectedGroupSets(sets, "group-1").map((set) => set.id)).toEqual(["first", "second"]);
    expect(getSelectedGroupSets(sets, null)).toEqual([]);
  });
});
