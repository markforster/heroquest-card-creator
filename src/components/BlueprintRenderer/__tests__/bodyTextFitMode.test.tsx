import { render } from "@testing-library/react";

type MockCardTextBlockProps = {
  fitToBounds?: boolean;
};

const mockCardTextBlock = jest.fn<null, [MockCardTextBlockProps]>(() => null);

jest.mock("@/components/Cards/CardParts/CardTextBlock", () => ({
  __esModule: true,
  default: (props: MockCardTextBlockProps) => mockCardTextBlock(props),
  layoutCardText: ({
    text,
    lineHeight,
    fontSize = 22,
  }: {
    text: string;
    lineHeight?: number;
    fontSize?: number;
  }) => ({
    lines: text.split(/\r?\n/).filter(Boolean),
    lineHeight: lineHeight ?? fontSize * 1.05,
  }),
}));

jest.mock("@/components/Providers/CopyrightSettingsContext", () => ({
  useCopyrightSettings: () => ({ defaultCopyright: "" }),
}));

jest.mock("@/components/Providers/DebugVisualsContext", () => ({
  useDebugVisuals: () => ({ showTextBounds: false }),
}));

jest.mock("@/hooks/useAssetImageUrl", () => ({
  useAssetImageUrl: () => ({ url: null, status: "idle" }),
}));

jest.mock("@/components/Cards/CardParts/HeroStatsBlock", () => ({
  __esModule: true,
  HERO_STATS_HEIGHT: 170,
  default: () => null,
}));

jest.mock("@/components/Cards/CardParts/MonsterStatsBlock", () => ({
  __esModule: true,
  MONSTER_STATS_HEIGHT: 179,
  default: () => null,
}));

import { renderGroups } from "@/components/BlueprintRenderer/blueprintRendererGroups";
import { TextLayer } from "@/components/BlueprintRenderer/blueprintRendererText";
import { blueprintsByTemplateId } from "@/data/blueprints";

describe("body text fit mode blueprint gating", () => {
  beforeEach(() => {
    mockCardTextBlock.mockClear();
  });

  it("honors fit-to-bounds for fixed-bounds description layers", () => {
    const blueprint = blueprintsByTemplateId["small-treasure"];
    const layer = blueprint?.layers.find((entry) => entry.id === "description");
    if (!blueprint || !layer) {
      throw new Error("small-treasure description layer missing");
    }

    render(
      <svg>
        <TextLayer
          blueprint={blueprint}
          layer={layer}
          cardData={{ description: "Example", bodyTextFitToBounds: true } as never}
        />
      </svg>,
    );

    const lastCall = (mockCardTextBlock.mock.calls as Array<[MockCardTextBlockProps]>).at(-1)?.[0];
    expect(lastCall?.fitToBounds).toBe(true);
  });

  it("ignores fit-to-bounds for auto-height stacked description blocks", () => {
    const blueprint = blueprintsByTemplateId.hero;
    if (!blueprint) {
      throw new Error("hero blueprint missing");
    }

    render(
      <svg>
        {renderGroups({
          blueprint,
          cardData: { description: "Example", bodyTextFitToBounds: true } as never,
          showTextBounds: false,
        })}
      </svg>,
    );

    const lastCall = (mockCardTextBlock.mock.calls as Array<[MockCardTextBlockProps]>).at(-1)?.[0];
    expect(lastCall?.fitToBounds).toBe(false);
  });
});
