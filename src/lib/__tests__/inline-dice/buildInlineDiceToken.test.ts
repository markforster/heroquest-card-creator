import { buildInlineDiceToken } from "@/lib/inline-dice";

describe("buildInlineDiceToken", () => {
  it("builds a canonical D6 token with default symbol colour", () => {
    expect(
      buildInlineDiceToken({
        type: "d6",
        faceOrValue: 4,
        backgroundColor: "#FFFFFF",
        symbolColor: "#111111",
      }),
    ).toBe("&d6-4-w;");
  });

  it("includes an overridden D6 symbol colour", () => {
    expect(
      buildInlineDiceToken({
        type: "d6",
        faceOrValue: 2,
        backgroundColor: "#FFFFFF",
        symbolColor: "#B21D1D",
      }),
    ).toBe("&d6-2-w-r;");
  });

  it("canonicalizes preset background hex input back to the readable alias", () => {
    expect(
      buildInlineDiceToken({
        type: "d6",
        faceOrValue: 1,
        backgroundColor: "#B21D1D",
        symbolColor: "#FFFFFF",
      }),
    ).toBe("&d6-1-r;");
  });

  it("canonicalizes preset symbol hex input back to the readable alias", () => {
    expect(
      buildInlineDiceToken({
        type: "d6",
        faceOrValue: 1,
        backgroundColor: "#FFFFFF",
        symbolColor: "#D6A600",
      }),
    ).toBe("&d6-1-w-y;");
  });

  it("builds icon dice tokens", () => {
    expect(
      buildInlineDiceToken({
        type: "icon",
        faceOrValue: "monster",
        backgroundColor: "#111111",
        symbolColor: "#FFFFFF",
      }),
    ).toBe("&cd-m-bk;");
  });

  it("builds detail dice tokens", () => {
    expect(
      buildInlineDiceToken({
        type: "detail",
        faceOrValue: "dd",
        backgroundColor: "#1C4AA8",
        symbolColor: "#FFFFFF",
      }),
    ).toBe("&cd-dd-bl;");
  });

  it("preserves custom hex colours in the canonical short token format", () => {
    expect(
      buildInlineDiceToken({
        type: "detail",
        faceOrValue: "md",
        backgroundColor: "#AABBCC",
        symbolColor: "#112233",
      }),
    ).toBe("&cd-md-#aabbcc-#112233;");
  });
});
