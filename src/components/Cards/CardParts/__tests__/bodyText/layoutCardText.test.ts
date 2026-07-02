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
});
