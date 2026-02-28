import { resolveSingleSelectToggle } from "@/components/Stockpile/stockpile-selection";

describe("resolveSingleSelectToggle", () => {
  it("selects when nothing selected", () => {
    expect(resolveSingleSelectToggle([], "a")).toEqual(["a"]);
  });

  it("clears when clicking the only selected card", () => {
    expect(resolveSingleSelectToggle(["a"], "a")).toEqual([]);
  });

  it("replaces when a different card is selected", () => {
    expect(resolveSingleSelectToggle(["b"], "a")).toEqual(["a"]);
  });

  it("replaces when multiple cards are selected", () => {
    expect(resolveSingleSelectToggle(["a", "b"], "a")).toEqual(["a"]);
  });
});

