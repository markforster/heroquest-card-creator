import {
  INLINE_DICE_RECENTS_STORAGE_KEY,
  loadInlineDiceRecents,
} from "@/components/Cards/CardInspector/inline-dice-recents";

describe("loadInlineDiceRecents", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("restores persisted recent tokens through token parsing", () => {
    window.localStorage.setItem(
      INLINE_DICE_RECENTS_STORAGE_KEY,
      JSON.stringify([
        {
          token: "&cd-dd-#aabbcc-#112233;",
          type: "d6",
          faceOrValue: 1,
          backgroundColor: "#FFFFFF",
          symbolColor: "#111111",
        },
      ]),
    );

    expect(loadInlineDiceRecents()).toEqual([
      {
        token: "&cd-dd-#aabbcc-#112233;",
        type: "detail",
        faceOrValue: "dd",
        backgroundColor: "#AABBCC",
        symbolColor: "#112233",
      },
    ]);
  });

  it("skips invalid persisted entries", () => {
    window.localStorage.setItem(
      INLINE_DICE_RECENTS_STORAGE_KEY,
      JSON.stringify([
        { token: "&cd-nope-w;" },
        { token: "&d6-1-w;", type: "d6", faceOrValue: 1, backgroundColor: "#FFFFFF", symbolColor: "#111111" },
      ]),
    );

    expect(loadInlineDiceRecents()).toEqual([
      {
        token: "&d6-1-w;",
        type: "d6",
        faceOrValue: 1,
        backgroundColor: "#FFFFFF",
        symbolColor: "#111111",
      },
    ]);
  });
});
