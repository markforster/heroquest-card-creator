import { render, screen } from "@testing-library/react";

import StatsPair from "@/components/Cards/CardParts/StatsPair";

jest.mock("@/lib/text-fitting/fitText", () => ({
  __esModule: true,
  default: () => ({
    lines: ["Attack"],
    fontSize: 22,
    lineHeight: 23.1,
  }),
}));

jest.mock("@/lib/text-fitting/shrink", () => ({
  shrinkToFitSingleLine: () => 56,
}));

jest.mock("@/components/Providers/TextFittingPreferencesContext", () => ({
  useTextFittingPreferences: () => ({
    preferences: {
      statHeading: {},
    },
  }),
}));

describe("StatsPair numeric features", () => {
  it("applies lining and tabular figure features to stat values", () => {
    const { container } = render(
      <svg>
        <StatsPair header="Attack" value={1234} x={0} y={0} width={160} height={120} />
      </svg>,
    );

    expect(screen.getByText("Attack")).toBeInTheDocument();

    const valueText = screen.getByText("1234");
    expect(valueText).toBeInTheDocument();
    const textElement = valueText.closest("text");
    expect(textElement).not.toBeNull();
    expect(textElement?.style.fontVariantNumeric).toBe("lining-nums tabular-nums");
    expect(textElement?.style.fontFeatureSettings).toBe('"lnum" 1, "tnum" 1');

    expect(container.querySelector('text[style*="font-variant-numeric"]')).toBe(textElement);
  });
});
