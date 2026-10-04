import { collectListRun } from "../../bodyText/listBlocks";

describe("collectListRun", () => {
  it("assigns independent root/child sequences and restarts each child parent", () => {
    const result = collectListRun(
      ["8. A", "  3. B", "  1. C", "99. D", "  - E", "  0. F", "- G", "  - H", "normal", "- Later"],
      0,
    );
    expect(result.nextIndex).toBe(8);
    expect(result.runs.map((run) => run.items.map((item) => item.marker))).toEqual([
      ["8.", "9."],
      ["•"],
    ]);
    expect(result.runs[0].items[0].children[0].items.map((item) => item.marker)).toEqual([
      "3.",
      "4.",
    ]);
    expect(result.runs[0].items[1].children.map((run) => run.items[0].marker)).toEqual(["•", "0."]);
  });
  it.each(["", "normal", "\\- Literal", "    - Deep", "-     Invalid"])(
    "stops at %s without consuming it",
    (boundary) => {
      expect(collectListRun(["- First", boundary, "  - Orphan"], 0).nextIndex).toBe(1);
    },
  );
  it("does not collect an orphan and permits generated ten-digit numbers", () => {
    expect(collectListRun(["  - Orphan"], 0)).toEqual({ runs: [], nextIndex: 0 });
    expect(collectListRun(["999999999. A", "1. B"], 0).runs[0].items[1].marker).toBe("1000000000.");
  });
});
