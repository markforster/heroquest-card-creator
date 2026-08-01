import { measureCardTextMaxLineWidth } from "@/components/Cards/CardParts/CardTextBlock";

describe("measureCardTextMaxLineWidth", () => {
  beforeEach(() => {
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      font: "",
      measureText: (value: string) => ({ width: value.length * 10 }),
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns zero for empty text and measures the widest laid-out line", () => {
    expect(measureCardTextMaxLineWidth({ text: "", width: 300 }).maxLineWidth).toBe(0);
    const result = measureCardTextMaxLineWidth({
      text: "Short\nLonger line",
      width: 300,
      fontSize: 20,
    });

    expect(result.maxLineWidth).toBeGreaterThan(0);
    expect(result.lines.length).toBeGreaterThan(0);
  });
});
