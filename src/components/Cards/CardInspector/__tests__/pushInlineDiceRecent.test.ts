import { pushInlineDiceRecent } from "@/components/Cards/CardInspector/inline-dice-recents";

describe("pushInlineDiceRecent", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("adds items, dedupes by token, and caps the list at five", () => {
    const entries = [
      { token: "&d6-1-w;", type: "d6", faceOrValue: 1, backgroundColor: "#FFFFFF", symbolColor: "#111111" },
      { token: "&d6-2-w;", type: "d6", faceOrValue: 2, backgroundColor: "#FFFFFF", symbolColor: "#111111" },
      { token: "&d6-3-w;", type: "d6", faceOrValue: 3, backgroundColor: "#FFFFFF", symbolColor: "#111111" },
      { token: "&d6-4-w;", type: "d6", faceOrValue: 4, backgroundColor: "#FFFFFF", symbolColor: "#111111" },
      { token: "&d6-5-w;", type: "d6", faceOrValue: 5, backgroundColor: "#FFFFFF", symbolColor: "#111111" },
    ] as const;

    const deduped = pushInlineDiceRecent([...entries], {
      type: "d6",
      faceOrValue: 3,
      backgroundColor: "#FFFFFF",
      symbolColor: "#111111",
    });

    expect(deduped).toHaveLength(5);
    expect(deduped[0].token).toBe("&d6-3-w;");
    expect(deduped.filter((entry) => entry.token === "&d6-3-w;")).toHaveLength(1);

    const capped = pushInlineDiceRecent(deduped, {
      type: "detail",
      faceOrValue: "md",
      backgroundColor: "#AABBCC",
      symbolColor: "#112233",
    });

    expect(capped).toHaveLength(5);
    expect(capped[0].token).toBe("&cd-md-#aabbcc-#112233;");
    expect(capped.at(-1)?.token).toBe("&d6-4-w;");
  });

  it("stores preset colors in their canonical alias form even when provided as hex", () => {
    const next = pushInlineDiceRecent([], {
      type: "d6",
      faceOrValue: 1,
      backgroundColor: "#B21D1D",
      symbolColor: "#FFFFFF",
    });

    expect(next).toEqual([
      {
        token: "&d6-1-r;",
        type: "d6",
        faceOrValue: 1,
        backgroundColor: "#B21D1D",
        symbolColor: "#FFFFFF",
      },
    ]);
  });
});
