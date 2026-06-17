import { layoutCardTextToBounds } from "@/components/Cards/CardParts/bodyText/fit";

describe("layoutCardTextToBounds", () => {
  it("shrinks and reflows when fit-to-bounds is enabled", () => {
    const layout = jest.fn(
      ({ fontSize = 20 }: { fontSize?: number }) => ({
        lines: [
          { kind: "text" as const, tokens: [] },
          { kind: "text" as const, tokens: [] },
          { kind: "text" as const, tokens: [] },
        ],
        lineHeight: fontSize,
      }),
    );

    const result = layoutCardTextToBounds({
      layout,
      text: "Long body text",
      width: 200,
      height: 40,
      fontSize: 20,
      fitToBounds: true,
      minFontSize: 10,
    });

    expect(result.fitApplied).toBe(true);
    expect(result.overflowed).toBe(false);
    expect(result.fittedFontSize).toBeLessThan(20);
    expect(result.lines).toHaveLength(3);
    expect(layout).toHaveBeenCalled();
  });

  it("reports overflow when minimum size still does not fit", () => {
    const layout = ({ fontSize = 20 }: { fontSize?: number }) => ({
      lines: Array.from({ length: 6 }, () => ({ kind: "text" as const, tokens: [] })),
      lineHeight: fontSize,
    });

    const result = layoutCardTextToBounds({
      layout,
      text: "Still too long",
      width: 200,
      height: 30,
      fontSize: 20,
      fitToBounds: true,
      minFontSize: 10,
    });

    expect(result.fitApplied).toBe(true);
    expect(result.overflowed).toBe(true);
    expect(result.fittedFontSize).toBe(10);
  });
});
