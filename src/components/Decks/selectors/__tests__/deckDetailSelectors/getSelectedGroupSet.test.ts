import { getSelectedGroup, getSelectedSet } from "@/components/Decks/selectors/deckDetailSelectors";

describe("getSelectedGroup", () => {
  it("returns matching group", () => {
    const groups = [{ id: "g1" }, { id: "g2" }] as never;
    expect(getSelectedGroup(groups, "g2")?.id).toBe("g2");
  });

  it("returns null for missing id", () => {
    const groups = [{ id: "g1" }] as never;
    expect(getSelectedGroup(groups, "g9")).toBeNull();
  });
});

describe("getSelectedSet", () => {
  it("returns matching set", () => {
    const sets = [{ id: "s1" }, { id: "s2" }] as never;
    expect(getSelectedSet(sets, "s1")?.id).toBe("s1");
  });

  it("returns null for null activeSetId", () => {
    expect(getSelectedSet([] as never, null)).toBeNull();
  });
});
