import { render, screen } from "@testing-library/react";

import StatsPair from "@/components/Cards/CardParts/StatsPair";
import { LocalStorageProvider } from "@/components/Providers/LocalStorageProvider";
import {
  TYPOGRAPHY_NUMERIC_STORAGE_KEYS,
} from "@/lib/typography-settings";

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
  beforeEach(() => {
    window.localStorage.clear();
  });

  it.each([
    [{}, "lining-nums tabular-nums", '"lnum" 1, "tnum" 1'],
    [{ [TYPOGRAPHY_NUMERIC_STORAGE_KEYS.statFixedWidthNumerals]: "0" }, "lining-nums", '"lnum" 1'],
    [{ [TYPOGRAPHY_NUMERIC_STORAGE_KEYS.statAlignedNumerals]: "0" }, "tabular-nums", '"tnum" 1'],
    [
      {
        [TYPOGRAPHY_NUMERIC_STORAGE_KEYS.statAlignedNumerals]: "0",
        [TYPOGRAPHY_NUMERIC_STORAGE_KEYS.statFixedWidthNumerals]: "0",
      },
      "",
      "",
    ],
  ])("applies stat numeral settings %#", (storedValues, expectedVariant, expectedFeatures) => {
    for (const [key, value] of Object.entries(storedValues)) {
      window.localStorage.setItem(key, value);
    }

    const { container } = render(
      <LocalStorageProvider>
        <svg>
          <StatsPair header="Attack" value={1234} x={0} y={0} width={160} height={120} />
        </svg>
      </LocalStorageProvider>,
    );

    expect(screen.getByText("Attack")).toBeInTheDocument();

    const valueText = screen.getByText("1234");
    expect(valueText).toBeInTheDocument();
    const textElement = valueText.closest("text");
    expect(textElement).not.toBeNull();
    expect(textElement?.style.fontVariantNumeric).toBe(expectedVariant);
    expect(textElement?.style.fontFeatureSettings).toBe(expectedFeatures);

    if (expectedVariant) {
      expect(container.querySelector('text[style*="font-variant-numeric"]')).toBe(textElement);
    } else {
      expect(container.querySelector('text[style*="font-variant-numeric"]')).toBeNull();
    }
  });
});
