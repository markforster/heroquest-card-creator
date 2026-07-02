import { getCardDisplayName } from "@/lib/card-display-name";

describe("getCardDisplayName", () => {
  it("prefers a trimmed title when present", () => {
    expect(getCardDisplayName({ title: "  Monster Card  ", name: "Fallback Name" }, "Untitled")).toBe(
      "Monster Card",
    );
  });

  it("falls back to a trimmed name when title is missing", () => {
    expect(getCardDisplayName({ name: "  Hero Back  " }, "Untitled")).toBe("Hero Back");
  });

  it("falls back to the provided label when neither title nor name is usable", () => {
    expect(getCardDisplayName({ title: "   ", name: "" }, "Untitled card")).toBe("Untitled card");
  });
});
