import { parseInlineDiceTokenToConfig } from "@/lib/inline-dice";

describe("parseInlineDiceTokenToConfig", () => {
  it("restores D6 configurator state from a canonical token", () => {
    expect(parseInlineDiceTokenToConfig("&d6-6-r;")).toEqual({
      type: "d6",
      faceOrValue: 6,
      backgroundColor: "#B21D1D",
      symbolColor: "#FFFFFF",
    });
  });

  it("restores icon dice configurator state", () => {
    expect(parseInlineDiceTokenToConfig("&cd-h-bk;")).toEqual({
      type: "icon",
      faceOrValue: "hero",
      backgroundColor: "#111111",
      symbolColor: "#FFFFFF",
    });
  });

  it("restores detail dice configurator state with explicit symbol colour", () => {
    expect(parseInlineDiceTokenToConfig("&cd-md-#aabbcc-#112233;")).toEqual({
      type: "detail",
      faceOrValue: "md",
      backgroundColor: "#AABBCC",
      symbolColor: "#112233",
    });
  });

  it("returns null for invalid tokens", () => {
    expect(parseInlineDiceTokenToConfig("&cd-unknown-w;")).toBeNull();
  });
});
