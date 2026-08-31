import { getCardDisplayName } from "@/lib/card-display-name";

describe("getCardDisplayName", () => {
  it("prefers a trimmed name when present", () => {
    expect(
      getCardDisplayName({ title: "  Monster Card  ", name: "Fallback Name" }, "Untitled"),
    ).toBe("Fallback Name");
  });

  it("falls back to a trimmed title when name is missing", () => {
    expect(getCardDisplayName({ title: "  Hero Back  " }, "Untitled")).toBe("Hero Back");
  });

  it("falls back to the provided label when neither title nor name is usable", () => {
    expect(getCardDisplayName({ title: "   ", name: "" }, "Untitled card")).toBe("Untitled card");
  });
});
