import { render, screen } from "@testing-library/react";

import CardTextBlock from "@/components/Cards/CardParts/CardTextBlock";

jest.mock("@/lib/inline-dice", () => ({
  tokenizeInlineDice: (text: string) => [{ kind: "text", text }],
}));

jest.mock("@/lib/text-fitting/measure", () => ({
  createTextMeasurer: () => (text: string) => text.length * 10,
}));

describe("CardTextBlock numeric features", () => {
  it("does not apply lining and tabular figure features to body text", () => {
    render(
      <svg>
        <CardTextBlock
          text="Room 101"
          bounds={{ x: 0, y: 0, width: 300, height: 80 }}
        />
      </svg>,
    );

    const bodyText = screen.getByText("Room 101");
    const textElement = bodyText.closest("text");
    expect(textElement).not.toBeNull();
    expect(textElement?.style.fontVariantNumeric).toBe("");
    expect(textElement?.style.fontFeatureSettings).toBe("");
  });
});
