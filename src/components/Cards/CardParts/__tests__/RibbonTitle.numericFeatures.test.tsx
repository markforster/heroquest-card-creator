import { render, screen } from "@testing-library/react";

import RibbonTitle from "@/components/Cards/CardParts/RibbonTitle";
import { LocalStorageProvider } from "@/components/Providers/LocalStorageProvider";
import { TYPOGRAPHY_NUMERIC_STORAGE_KEYS } from "@/lib/typography-settings";

jest.mock("@/lib/text-fitting/fitText", () => ({
  __esModule: true,
  default: () => ({
    lines: ["Quest 123"],
    fontSize: 42,
  }),
}));

jest.mock("@/components/Providers/TextFittingPreferencesContext", () => ({
  useTextFittingPreferences: () => ({
    preferences: {
      title: {},
    },
  }),
}));

jest.mock("@/components/Providers/DebugVisualsContext", () => ({
  useDebugVisuals: () => ({
    showTextBounds: false,
  }),
}));

describe("RibbonTitle numeric features", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it.each([
    [{}, "lining-nums tabular-nums", '"lnum" 1, "tnum" 1'],
    [{ [TYPOGRAPHY_NUMERIC_STORAGE_KEYS.titleFixedWidthNumerals]: "0" }, "lining-nums", '"lnum" 1'],
    [{ [TYPOGRAPHY_NUMERIC_STORAGE_KEYS.titleAlignedNumerals]: "0" }, "tabular-nums", '"tnum" 1'],
    [
      {
        [TYPOGRAPHY_NUMERIC_STORAGE_KEYS.titleAlignedNumerals]: "0",
        [TYPOGRAPHY_NUMERIC_STORAGE_KEYS.titleFixedWidthNumerals]: "0",
      },
      "",
      "",
    ],
  ])("applies title numeral settings %#", (storedValues, expectedVariant, expectedFeatures) => {
    for (const [key, value] of Object.entries(storedValues)) {
      window.localStorage.setItem(key, value);
    }

    render(
      <LocalStorageProvider>
        <svg>
          <RibbonTitle title="Quest 123" showRibbon={false} />
        </svg>
      </LocalStorageProvider>,
    );

    expect(screen.getByText("Quest 123")).toBeInTheDocument();
    const textElement = screen.getByText("Quest 123").closest("text");
    expect(textElement).not.toBeNull();
    expect(textElement?.style.fontVariantNumeric).toBe(expectedVariant);
    expect(textElement?.style.fontFeatureSettings).toBe(expectedFeatures);
  });
});
