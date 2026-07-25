import { layoutCardTextToBounds } from "@/components/Cards/CardParts/bodyText/fit";

function buildMockLayout({
  textRowCount,
  fontSize,
  paragraphGapCount = 0,
  paragraphGap = fontSize,
}: {
  textRowCount: number;
  fontSize: number;
  paragraphGapCount?: number;
  paragraphGap?: number;
}) {
  const textRows = Array.from({ length: textRowCount }, () => ({
    kind: "text" as const,
    tokens: [],
    height: fontSize,
  }));
  const paragraphRows = Array.from({ length: paragraphGapCount }, () => ({
    kind: "paragraph-gap" as const,
    height: paragraphGap,
  }));
  const rows = [...textRows, ...paragraphRows];
  return {
    rows,
    lines: textRows,
    lineHeight: fontSize,
    paragraphGap,
    totalHeight: textRowCount * fontSize + paragraphGapCount * paragraphGap,
  };
}

describe("layoutCardTextToBounds", () => {
  it("shrinks and reflows when fit-to-bounds is enabled", () => {
    const layout = jest.fn(
      ({ fontSize = 20 }: { fontSize?: number }) => ({
        ...buildMockLayout({ textRowCount: 3, fontSize }),
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
      ...buildMockLayout({ textRowCount: 6, fontSize }),
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

  it("includes paragraph-gap height when deciding overflow and best fit", () => {
    const layout = jest.fn(({ fontSize = 20 }: { fontSize?: number }) =>
      buildMockLayout({
        textRowCount: 2,
        fontSize,
        paragraphGapCount: 1,
        paragraphGap: fontSize,
      }),
    );

    const result = layoutCardTextToBounds({
      layout,
      text: "Para one\n\nPara two",
      width: 200,
      height: 50,
      fontSize: 20,
      fitToBounds: true,
      minFontSize: 10,
    });

    expect(result.fitApplied).toBe(true);
    expect(result.overflowed).toBe(false);
    expect(result.fittedFontSize).toBeLessThan(20);
    expect(result.totalHeight).toBeLessThanOrEqual(50);
  });

  it("scales stacked paragraph gaps with the candidate font size", () => {
    const layout = ({ fontSize = 20 }: { fontSize?: number }) =>
      buildMockLayout({
        textRowCount: 2,
        fontSize,
        paragraphGapCount: 2,
        paragraphGap: fontSize,
      });

    const result = layoutCardTextToBounds({
      layout,
      text: "Para one\n\n\nPara two",
      width: 200,
      height: 45,
      fontSize: 20,
      fitToBounds: true,
      minFontSize: 8,
    });

    expect(result.fitApplied).toBe(true);
    expect(result.paragraphGap).toBe(result.fittedFontSize);
    expect(result.totalHeight).toBeLessThanOrEqual(45);
  });
});
