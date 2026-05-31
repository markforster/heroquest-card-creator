import { buildDeckDeepLink } from "@/components/Decks/deckDeepLink";

describe("buildDeckDeepLink", () => {
  it("builds deck root route", () => {
    expect(buildDeckDeepLink({ deckId: "deck-1" })).toBe("/decks/deck-1");
  });

  it("builds set route", () => {
    expect(buildDeckDeepLink({ deckId: "deck-1", setId: "set-1" })).toBe(
      "/decks/deck-1/set/set-1",
    );
  });

  it("builds set + entry route", () => {
    expect(
      buildDeckDeepLink({ deckId: "deck-1", setId: "set-1", entryId: "entry-1" }),
    ).toBe("/decks/deck-1/set/set-1/entry/entry-1");
  });
});
