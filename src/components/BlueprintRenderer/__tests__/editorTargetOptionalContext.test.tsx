import { render, screen } from "@testing-library/react";

import BlueprintRenderer from "@/components/BlueprintRenderer";

jest.mock("@/components/Providers/DebugVisualsContext", () => ({
  useDebugVisuals: () => ({
    showTextBounds: false,
  }),
}));

jest.mock("@/components/Providers/CopyrightSettingsContext", () => ({
  useCopyrightSettings: () => ({
    defaultCopyright: "Default Copyright",
  }),
}));

jest.mock("@/components/Providers/StatLabelOverridesProvider", () => ({
  useStatLabelOverrides: () => ({
    overrides: {},
  }),
}));

jest.mock("@/components/Providers/TextFittingPreferencesContext", () => ({
  useTextFittingPreferences: () => ({
    preferences: {
      title: {},
    },
  }),
}));

jest.mock("@/lib/typography-settings", () => ({
  useTypographyNumericSettings: () => ({
    titleAlignedNumerals: false,
    titleFixedWidthNumerals: false,
  }),
}));

jest.mock("@/hooks/useAssetImageUrl", () => ({
  useAssetImageUrl: (assetId?: string) => ({
    url: assetId ? `asset://${assetId}` : null,
    status: assetId ? "ready" : "missing",
  }),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/lib/text-fitting/fitText", () => ({
  __esModule: true,
  default: () => ({
    lines: ["Example"],
    fontSize: 48,
  }),
}));

jest.mock("@/components/Cards/CardParts/CardTextBlock", () => ({
  __esModule: true,
  default: ({ text }: { text?: string }) => <text>{text}</text>,
  clipRowsToHeight: (rows: Array<{ kind: string; height: number }>) => rows,
  layoutCardText: ({ text = "", lineHeight = 20 }: { text?: string; lineHeight?: number }) => ({
    rows: text ? [{ kind: "text", height: lineHeight }] : [],
    lines: text ? [text] : [],
    lineHeight,
    totalHeight: text ? lineHeight : 0,
  }),
  measureCardTextMaxLineWidth: () => ({
    maxLineWidth: 0,
  }),
}));

describe("BlueprintRenderer outside EditorTargetsProvider", () => {
  it("renders shared preview compositions without editor target context", () => {
    const { container, rerender } = render(
      <svg>
        <BlueprintRenderer
          templateId="hero"
          templateName="Hero"
          cardData={{
            title: "Sir Ragnar",
            description: "Body text",
            imageAssetId: "art-1",
            copyright: "Hero Copyright",
            showCopyright: true,
          } as never}
        />
      </svg>,
    );

    expect(container.querySelector("[data-user-asset-id='art-1']")).not.toBeNull();
    expect(screen.getByText("Body text")).toBeInTheDocument();
    expect(container.querySelector("[data-hqcc-hover-overlay='true']")).toBeNull();

    rerender(
      <svg>
        <BlueprintRenderer
          templateId="labelled-back"
          templateName="Labelled Back"
          cardData={{
            title: "Lore Card",
            description: "Back text",
            imageAssetId: "art-5",
            titlePlacement: "bottom",
            showTitle: true,
          } as never}
        />
      </svg>,
    );

    expect(container.querySelector("[data-user-asset-id='art-5']")).not.toBeNull();
    expect(container.querySelector("[data-hqcc-hit-area='title']")).not.toBeNull();
  });
});
