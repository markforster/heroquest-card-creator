import { nextDuplicateTitle } from "@/components/App/pages/cards/cardPageActions";

describe("nextDuplicateTitle", () => {
  it("adds a second-copy suffix when the title has no copy suffix", () => {
    expect(nextDuplicateTitle("Heroic Charge")).toBe("Heroic Charge (2)");
  });

  it("increments an existing numeric copy suffix", () => {
    expect(nextDuplicateTitle("Heroic Charge (2)")).toBe("Heroic Charge (3)");
  });

  it("trims whitespace before generating the next title", () => {
    expect(nextDuplicateTitle("  Heroic Charge  ")).toBe("Heroic Charge (2)");
  });

  it("leaves an empty title empty", () => {
    expect(nextDuplicateTitle("   ")).toBe("");
  });
});
