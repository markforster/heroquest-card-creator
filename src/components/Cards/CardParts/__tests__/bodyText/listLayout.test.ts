import { layoutCardTextToBounds } from "../../bodyText/fit";
import { layoutCardText, clipRowsToHeight, measureCardTextMaxLineWidth } from "../../CardTextBlock";
import corpus from "../fixtures/structured-lists.json";

jest.mock("@/lib/text-fitting/measure", () => ({
  createTextMeasurer: (size: number) => (text: string) => (text.length * size) / 2,
}));
const layout = (text: string, width = 200) =>
  layoutCardText({ text, width, fontSize: 20, lineHeight: 20, enableLists: true });

describe("list layout through the public body-text API", () => {
  it.each(corpus.cases)("matches the adopted marker sequence for $id", (fixture) => {
    const rows = layout(fixture.text, 10000).rows;
    expect(rows.flatMap((row) => (row.kind === "list" && row.marker ? [row.marker] : []))).toEqual(
      fixture.expectedMarkers,
    );
  });
  it("uses hanging indents and one marker per source item", () => {
    const rows = layout("- Alpha beta gamma delta\n  - Child words wrap here").rows;
    const lists = rows.filter((row) => row.kind === "list");
    expect(lists.filter((row) => row.marker)).toHaveLength(2);
    expect(
      lists.filter((row) => row.sourceLineIndex === 0).map((row) => row.contentOffset),
    ).toEqual([27, 27]);
    expect(
      lists.filter((row) => row.sourceLineIndex === 1).every((row) => row.contentOffset === 54),
    ).toBe(true);
    expect(lists[0].markerEnd).toBe(20);
  });
  it("measures all sibling markers before wrapping, including clipped items", () => {
    const result = layout("9. A\n1. B");
    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ marker: "9.", contentOffset: 37 }),
        expect.objectContaining({ marker: "10.", contentOffset: 37 }),
      ]),
    );
    expect(clipRowsToHeight(result.rows, 20)[0]).toMatchObject({ contentOffset: 37 });
    expect(
      measureCardTextMaxLineWidth({
        text: "9. A\n1. B",
        width: 200,
        fontSize: 20,
        enableLists: true,
      }).maxLineWidth,
    ).toBe(47);
  });
  it("retains empty styled items and mixed-scale metrics", () => {
    expect(layout("- <b></b>\n- <scale=1.5>Big</scale>").rows).toMatchObject([
      { marker: "•", height: 20, tokens: [] },
      { marker: "•", height: 30, baselineOffset: 30 },
    ]);
  });
  it("preserves markup as inline content without invoking block dispatch", () => {
    const rows = layout("- <title>Literal</title>\n- [Cost[.]50]\n- :::ac Text:::", 1000).rows;
    expect(rows.every((row) => row.kind === "list")).toBe(true);
    const first = rows[0];
    if (first.kind !== "list") throw new Error("Expected list");
    expect(first.tokens.map((token) => (token.kind === "text" ? token.text : "")).join("")).toBe(
      "<title>Literal</title>",
    );
  });
  it("honours ambient alignment, multiline-inline exceptions, escapes and CRLF", () => {
    const rows = layout(
      ":::ac\r\n- A\r\nnormal\r\n:::ar intro\r\n- literal\r\n:::\r\n\\- escaped\r\n  - orphan",
      1000,
    ).rows;
    expect(rows[0].kind).toBe("list");
    expect(rows[1]).toMatchObject({ kind: "text", align: "center" });
    expect(rows[3]).toMatchObject({ kind: "text", align: "right" });
    expect(rows.slice(-2).every((row) => row.kind === "text")).toBe(true);
  });
  it("does not recognize a list inside a leader-group fallback", () => {
    expect(
      layout("[[\n[Cost[.]50]\n- fallback\n]]\n- real", 1000).rows.map((row) => row.kind),
    ).toEqual(["leader", "text", "text", "list"]);
  });
  it("retains every authored blank-line gap and restarts numbering", () => {
    expect(
      layout("1. A\n\n\n7. B\n99. C").rows.map((row) =>
        row.kind === "list" ? row.marker : row.kind,
      ),
    ).toEqual(["1.", "paragraph-gap", "paragraph-gap", "7.", "8."]);
  });
  it("stops at the first unfit row rather than displaying later shorter rows", () => {
    expect(
      clipRowsToHeight(layout("Normal\n<scale=1.5>Tall</scale>\nshort").rows, 40),
    ).toHaveLength(1);
    expect(clipRowsToHeight(layout("- A\n\n- B").rows, 40)).toHaveLength(1);
  });
  it("reports horizontal failures and preserves an invisible source-order stop", () => {
    const failed = layout("- &cd-ad-r;\nLater", 45);
    expect(failed.horizontalOverflow).toBe(true);
    expect(clipRowsToHeight(failed.rows, 100)).toEqual([]);
    expect(layout("- Item", 10).rows[0]).toMatchObject({ blocked: true });
  });
  it("reflows indentation and atomic dice during fitting", () => {
    const fitted = layoutCardTextToBounds({
      layout: layoutCardText,
      text: "- &cd-ad-r;",
      width: 50,
      height: 100,
      fontSize: 20,
      minFontSize: 10,
      fitToBounds: true,
      enableLists: true,
    });
    expect(fitted.fitApplied).toBe(true);
    expect(fitted.overflowed).toBe(false);
    expect(fitted.fittedFontSize).toBeLessThan(20);
    expect(fitted.rows[0]).toMatchObject({
      kind: "list",
      contentOffset: fitted.fittedFontSize * 1.35,
    });
  });
  it.each(
    corpus.cases.filter(
      (entry) => entry.category === "regression" || entry.id === "invalid-markers",
    ),
  )("keeps $id identical with lists enabled", (fixture) => {
    const options = { text: fixture.text, width: 250, fontSize: 20 };
    expect(layoutCardText({ ...options, enableLists: true })).toEqual(layoutCardText(options));
  });
});
