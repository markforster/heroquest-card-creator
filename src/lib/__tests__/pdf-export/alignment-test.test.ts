import {
  buildAlignmentTestComposition,
  buildSingleSheetAlignmentComposition,
  parseAlignmentFaceId,
} from "@/lib/pdf-export/alignment-test";

describe("pdf-export alignment-test", () => {
  it("builds synthetic slot ids without changing sheet shape", () => {
    const base = {
      totalSlots: 3,
      sheets: [
        { sheetIndex: 0, slots: [{ slotId: "a", frontId: "f1", backId: "b1" }, { slotId: "b", frontId: "f2", backId: "b2" }] },
        { sheetIndex: 1, slots: [{ slotId: "c", frontId: "f3", backId: "b3" }] },
      ],
    };

    const next = buildAlignmentTestComposition(base, true);
    expect(next.totalSlots).toBe(3);
    expect(next.sheets).toHaveLength(2);
    expect(next.sheets[0].slots[0].frontId).toBe("align-front-0-0");
    expect(next.sheets[0].slots[0].backId).toBe("align-back-0-0");
    expect(next.sheets[1].slots[0].frontId).toBe("align-front-1-0");
  });

  it("parses synthetic alignment ids", () => {
    expect(parseAlignmentFaceId("align-front-2-7")).toEqual({
      side: "front",
      sheetIndex: 2,
      slotIndex: 7,
      slotNumber: 8,
    });
    expect(parseAlignmentFaceId("oops")).toBeNull();
  });

  it("builds a single-sheet composition capped to per-page slots", () => {
    const next = buildSingleSheetAlignmentComposition(9, true);
    expect(next.totalSlots).toBe(9);
    expect(next.sheets).toHaveLength(1);
    expect(next.sheets[0].slots).toHaveLength(9);
    expect(next.sheets[0].slots[8].frontId).toBe("align-front-0-8");
    expect(next.sheets[0].slots[8].backId).toBe("align-back-0-8");
  });
});
