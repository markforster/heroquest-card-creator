import { render, screen } from "@testing-library/react";

import CardTextBlock from "@/components/Cards/CardParts/CardTextBlock";

jest.mock("@/lib/inline-dice", () => ({
  tokenizeInlineDice: (text: string) => [{ kind: "text", text }],
}));

jest.mock("@/lib/text-fitting/measure", () => ({
  createTextMeasurer:
    () =>
    (text: string): number =>
      text.length * 10,
}));

describe("CardTextBlock rich text rendering", () => {
  it("renders inline underline and color styles on SVG tspans", () => {
    const { container } = render(
      <svg>
        <CardTextBlock
          text={"<u>Under</u> <color=#ff0000>Red</color>"}
          bounds={{ x: 0, y: 0, width: 300, height: 120 }}
        />
      </svg>,
    );

    const underlineSpan = screen.getByText("Under");
    const colorSpan = screen.getByText("Red");
    const svgSpans = container.querySelectorAll("tspan");

    expect(underlineSpan.tagName.toLowerCase()).toBe("tspan");
    expect(svgSpans).toHaveLength(3);
    expect((underlineSpan as unknown as SVGElement).style.textDecoration).toBe("underline");
    expect((colorSpan as unknown as SVGElement).style.fill).toBe("#ff0000");
  });
});
