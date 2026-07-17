import { layoutCardText } from "@/components/Cards/CardParts/CardTextBlock";

jest.mock("@/lib/inline-dice", () => ({
  tokenizeInlineDice: (text: string) => [{ kind: "text", text }],
}));

jest.mock("@/lib/text-fitting/measure", () => ({
  createTextMeasurer: () => (text: string) => text.length * 10,
}));

describe("layoutCardText", () => {
  it("creates one paragraph-gap row for one blank line", () => {
    const result = layoutCardText({
      text: "Alpha\n\nBeta",
      width: 300,
      fontSize: 20,
      lineHeight: 20,
    });

    expect(result.rows.map((row) => row.kind)).toEqual(["text", "paragraph-gap", "text"]);
    expect(result.paragraphGap).toBe(20);
    expect(result.totalHeight).toBe(60);
  });

  it("stacks consecutive blank lines as authored", () => {
    const result = layoutCardText({
      text: "Alpha\n\n\nBeta",
      width: 300,
      fontSize: 20,
      lineHeight: 20,
    });

    expect(result.rows.map((row) => row.kind)).toEqual([
      "text",
      "paragraph-gap",
      "paragraph-gap",
      "text",
    ]);
    expect(result.totalHeight).toBe(80);
  });

  it("uses the largest scaled span on a visual line to determine row height", () => {
    const result = layoutCardText({
      text: "Alpha <scale=1.5>Beta</scale>",
      width: 300,
      fontSize: 20,
      lineHeight: 20,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      kind: "text",
      height: 30,
      baselineOffset: 30,
      maxFontSize: 30,
    });
  });

  it("treats title and subtitle tags as block-only macro lines", () => {
    const result = layoutCardText({
      text: "<title>Alpha</title>\n<subtitle>Beta</subtitle>",
      width: 300,
      fontSize: 20,
      lineHeight: 20,
    });

    expect(result.rows.map((row) => row.kind)).toEqual(["text", "text"]);
    expect(result.totalHeight).toBe(48);
    expect(result.rows[0]).toMatchObject({
      kind: "text",
      height: 24,
      baselineOffset: 24,
      maxFontSize: 24,
    });
    expect(result.rows[1]).toMatchObject({
      kind: "text",
      height: 24,
      baselineOffset: 24,
      maxFontSize: 24,
    });
  });

  it("does not add automatic spacing around title or subtitle blocks", () => {
    const result = layoutCardText({
      text: "Alpha\n<title>Bravo</title>\n<subtitle>Charlie</subtitle>\nDelta",
      width: 300,
      fontSize: 20,
      lineHeight: 20,
    });

    const gapHeights = result.rows
      .filter((row): row is Extract<(typeof result.rows)[number], { kind: "paragraph-gap" }> => row.kind === "paragraph-gap")
      .map((row) => row.height);

    expect(gapHeights).toEqual([]);
  });

  it("preserves nested inline formatting inside title and subtitle blocks", () => {
    const result = layoutCardText({
      text: "<title><color=#ff0000>Alpha</color></title>\n<subtitle><u>Beta</u></subtitle>",
      width: 300,
      fontSize: 20,
      lineHeight: 20,
    });

    const titleRow = result.rows[0];
    const subtitleRow = result.rows[1];

    expect(titleRow).toMatchObject({ kind: "text" });
    expect(subtitleRow).toMatchObject({ kind: "text" });
    if (titleRow.kind !== "text" || subtitleRow.kind !== "text") {
      throw new Error("Expected text rows for block macros");
    }

    expect(titleRow.tokens).toEqual([{ kind: "text", text: "Alpha", bold: true, color: "#ff0000", scale: 1.2 }]);
    expect(subtitleRow.tokens).toEqual([{ kind: "text", text: "Beta", italic: true, underline: true, scale: 1.2 }]);
  });

  it("does not treat inline title markup inside prose as a macro block", () => {
    const result = layoutCardText({
      text: "Alpha <title>Beta</title> Gamma",
      width: 1000,
      fontSize: 20,
      lineHeight: 20,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      kind: "text",
      height: 20,
      baselineOffset: 20,
      maxFontSize: 20,
    });
  });
});
