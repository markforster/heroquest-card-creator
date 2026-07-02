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

  it("reduces paragraph spacing when fit-to-bounds shrinks multi-paragraph text", () => {
    const { container: unfittedContainer } = render(
      <svg>
        <CardTextBlock
          text={"Alpha\n\nBeta"}
          bounds={{ x: 0, y: 0, width: 300, height: 120 }}
          fontSize={20}
          lineHeight={20}
        />
      </svg>,
    );

    const { container: fittedContainer } = render(
      <svg>
        <CardTextBlock
          text={"Alpha\n\nBeta"}
          bounds={{ x: 0, y: 0, width: 300, height: 40 }}
          fontSize={20}
          lineHeight={20}
          fitToBounds
        />
      </svg>,
    );

    const unfittedTextNodes = Array.from(unfittedContainer.querySelectorAll("text"));
    const fittedTextNodes = Array.from(fittedContainer.querySelectorAll("text"));
    const unfittedGap =
      Number(unfittedTextNodes[1]?.getAttribute("y")) - Number(unfittedTextNodes[0]?.getAttribute("y"));
    const fittedGap =
      Number(fittedTextNodes[1]?.getAttribute("y")) - Number(fittedTextNodes[0]?.getAttribute("y"));

    expect(unfittedTextNodes).toHaveLength(2);
    expect(fittedTextNodes).toHaveLength(2);
    expect(fittedGap).toBeLessThan(unfittedGap);
  });

  it("clips by accumulated row height and drops overflowing paragraph gaps", () => {
    render(
      <svg>
        <CardTextBlock
          text={"Alpha\n\nBeta"}
          bounds={{ x: 0, y: 0, width: 300, height: 30 }}
          fontSize={20}
          lineHeight={20}
        />
      </svg>,
    );

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).toBeNull();
  });
});
