import { layoutCardText } from "@/components/Cards/CardParts/CardTextBlock";

import corpus from "../fixtures/structured-lists.json";

jest.mock("@/lib/text-fitting/measure", () => ({
  createTextMeasurer: () => (text: string) => text.length * 10,
}));

function layout(id: string) {
  const fixture = corpus.cases.find((entry) => entry.id === id);
  if (!fixture) throw new Error(`Missing fixture: ${id}`);
  return layoutCardText({ text: fixture.text, width: 10000, fontSize: 20, lineHeight: 20 });
}

describe("shared UI corpus: existing rich-text behaviour", () => {
  it.each(corpus.cases.filter((entry) => entry.baselineLines))(
    "$id preserves the expected visible text after current markup processing",
    (fixture) => {
      const visibleLines = layout(fixture.id).lines.map((row) => {
        if (row.kind !== "text") throw new Error("Expected ordinary text row");
        return row.tokens.map((token) => (token.kind === "text" ? token.text : "[dice]")).join("");
      });
      expect(visibleLines).toEqual(fixture.baselineLines);
    },
  );

  it("preserves leader grouping and its shared value-column origin", () => {
    const leaders = layout("legacy-leaders").lines;
    expect(leaders.map((row) => row.kind)).toEqual(["leader", "leader", "leader"]);
    const range = leaders[1];
    const effect = leaders[2];
    if (range.kind !== "leader" || effect.kind !== "leader") throw new Error("Expected leaders");
    expect(range.leaderLayout?.valueStartOffset).toBe(5000);
    expect(effect.leaderLayout).toEqual(range.leaderLayout);
  });

  it("uses real dice tokenization for the shared symbols sample", () => {
    const tokens = layout("legacy-dice").lines.flatMap((row) =>
      row.kind === "text" ? row.tokens : [],
    );
    expect(tokens.filter((token) => token.kind === "dice")).toHaveLength(4);
    expect(
      tokens
        .filter((token) => token.kind === "text")
        .map((token) => token.text)
        .join(""),
    ).not.toMatch(/&(?:cd|d6)-/);
  });

  it("keeps authored heading spacing and relative row metrics", () => {
    const result = layout("legacy-headings");
    expect(result.rows.map((row) => row.height)).toEqual([24, 24, 30, 20, 20, 20]);
    expect(result.totalHeight).toBe(138);
  });
});
