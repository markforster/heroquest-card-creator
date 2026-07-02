import { fireEvent, render } from "@testing-library/react";

import BlueprintRenderer from "@/components/BlueprintRenderer";
import { EDITOR_TARGET_IDS } from "@/components/Cards/CardEditor/EditorTargetsContext";

const mockRequestFocusTarget = jest.fn();

jest.mock("@/components/Cards/CardEditor/EditorTargetsContext", () => ({
  EDITOR_TARGET_IDS: {
    title: "title",
    imageMain: "image.main",
    imageIcon: "image.icon",
    textMain: "text.main",
    statsHero: "stats.hero",
    statsHeroAttackDice: "stats.hero.attackDice",
    statsHeroDefendDice: "stats.hero.defendDice",
    statsHeroBodyPoints: "stats.hero.bodyPoints",
    statsHeroMindPoints: "stats.hero.mindPoints",
    statsMonster: "stats.monster",
    statsMonsterMovementSquares: "stats.monster.movementSquares",
    statsMonsterAttackDice: "stats.monster.attackDice",
    statsMonsterDefendDice: "stats.monster.defendDice",
    statsMonsterBodyPoints: "stats.monster.bodyPoints",
    statsMonsterMindPoints: "stats.monster.mindPoints",
    copyright: "copyright",
  },
  HERO_STAT_TARGET_IDS: {
    attackDice: "stats.hero.attackDice",
    defendDice: "stats.hero.defendDice",
    bodyPoints: "stats.hero.bodyPoints",
    mindPoints: "stats.hero.mindPoints",
  },
  MONSTER_STAT_TARGET_IDS: {
    movementSquares: "stats.monster.movementSquares",
    attackDice: "stats.monster.attackDice",
    defendDice: "stats.monster.defendDice",
    bodyPoints: "stats.monster.bodyPoints",
    mindPoints: "stats.monster.mindPoints",
  },
  useEditorTargets: () => ({
    hoveredTargetId: null,
  }),
  useRegisterHoverAdornment: () => undefined,
  useRegisterHoverAdornments: () => undefined,
  useSvgFocusTarget: (targetId: string) => ({
    "data-hqcc-edit": targetId,
    onClick: () => mockRequestFocusTarget(targetId),
    style: { cursor: "pointer" },
  }),
}));

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

describe("BlueprintRenderer SVG focus targets", () => {
  beforeEach(() => {
    mockRequestFocusTarget.mockReset();
  });

  it("requests focus for the mapped hero targets", () => {
    const { container } = render(
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

    const targets = [
      EDITOR_TARGET_IDS.title,
      EDITOR_TARGET_IDS.imageMain,
      EDITOR_TARGET_IDS.textMain,
      EDITOR_TARGET_IDS.statsHero,
      EDITOR_TARGET_IDS.copyright,
    ];

    targets.forEach((targetId) => {
      const node = container.querySelector(`[data-hqcc-edit="${targetId}"]`);
      expect(node).not.toBeNull();
      fireEvent.click(node as Element);
      expect(mockRequestFocusTarget).toHaveBeenCalledWith(targetId);
    });

    const copyrightHitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.copyright}"]`,
    );
    expect(copyrightHitArea).not.toBeNull();
    fireEvent.click(copyrightHitArea as Element);
    expect(mockRequestFocusTarget).toHaveBeenCalledWith(EDITOR_TARGET_IDS.copyright);
  });

  it("requests focus for individual hero stat cell targets and keeps panel fallback", () => {
    const { container } = render(
      <svg>
        <BlueprintRenderer
          templateId="hero"
          templateName="Hero"
          cardData={{
            title: "Sir Ragnar",
            description: "Body text",
            imageAssetId: "art-1",
            showCopyright: false,
          } as never}
        />
      </svg>,
    );

    const panelHitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.statsHero}"]`,
    );
    const attackHitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.statsHeroAttackDice}"]`,
    );
    const mindHitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.statsHeroMindPoints}"]`,
    );

    expect(panelHitArea).not.toBeNull();
    expect(attackHitArea).not.toBeNull();
    expect(mindHitArea).not.toBeNull();

    fireEvent.click(panelHitArea as Element);
    fireEvent.click(attackHitArea as Element);
    fireEvent.click(mindHitArea as Element);

    expect(mockRequestFocusTarget).toHaveBeenCalledWith(EDITOR_TARGET_IDS.statsHero);
    expect(mockRequestFocusTarget).toHaveBeenCalledWith(EDITOR_TARGET_IDS.statsHeroAttackDice);
    expect(mockRequestFocusTarget).toHaveBeenCalledWith(EDITOR_TARGET_IDS.statsHeroMindPoints);
  });

  it("requests focus for monster-only targets and omits absent optional targets", () => {
    const { container, rerender } = render(
      <svg>
        <BlueprintRenderer
          templateId="monster"
          templateName="Monster"
          cardData={{
            title: "Fimir",
            description: "Rules text",
            imageAssetId: "art-2",
            iconAssetId: "icon-1",
            copyright: "Monster Copyright",
            showCopyright: true,
          } as never}
        />
      </svg>,
    );

    const iconTarget = container.querySelector(
      `[data-hqcc-edit="${EDITOR_TARGET_IDS.imageIcon}"]`,
    );
    const statsTarget = container.querySelector(
      `[data-hqcc-edit="${EDITOR_TARGET_IDS.statsMonster}"]`,
    );

    expect(iconTarget).not.toBeNull();
    expect(statsTarget).not.toBeNull();

    fireEvent.click(iconTarget as Element);
    fireEvent.click(statsTarget as Element);

    expect(mockRequestFocusTarget).toHaveBeenCalledWith(EDITOR_TARGET_IDS.imageIcon);
    expect(mockRequestFocusTarget).toHaveBeenCalledWith(EDITOR_TARGET_IDS.statsMonster);

    rerender(
      <svg>
        <BlueprintRenderer
          templateId="monster"
          templateName="Monster"
          cardData={{
            title: "Fimir",
            description: "Rules text",
            imageAssetId: "art-2",
            showCopyright: false,
          } as never}
        />
      </svg>,
    );

    expect(
      container.querySelector(`[data-hqcc-edit="${EDITOR_TARGET_IDS.imageIcon}"]`),
    ).toBeNull();
    expect(
      container.querySelector(`[data-hqcc-edit="${EDITOR_TARGET_IDS.copyright}"]`),
    ).toBeNull();
  });

  it("requests focus for individual monster stat cell targets and keeps panel fallback", () => {
    const { container } = render(
      <svg>
        <BlueprintRenderer
          templateId="monster"
          templateName="Monster"
          cardData={{
            title: "Fimir",
            description: "Rules text",
            imageAssetId: "art-2",
            showCopyright: false,
          } as never}
        />
      </svg>,
    );

    const panelHitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.statsMonster}"]`,
    );
    const moveHitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.statsMonsterMovementSquares}"]`,
    );
    const bodyHitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.statsMonsterBodyPoints}"]`,
    );

    expect(panelHitArea).not.toBeNull();
    expect(moveHitArea).not.toBeNull();
    expect(bodyHitArea).not.toBeNull();

    fireEvent.click(panelHitArea as Element);
    fireEvent.click(moveHitArea as Element);
    fireEvent.click(bodyHitArea as Element);

    expect(mockRequestFocusTarget).toHaveBeenCalledWith(EDITOR_TARGET_IDS.statsMonster);
    expect(mockRequestFocusTarget).toHaveBeenCalledWith(
      EDITOR_TARGET_IDS.statsMonsterMovementSquares,
    );
    expect(mockRequestFocusTarget).toHaveBeenCalledWith(
      EDITOR_TARGET_IDS.statsMonsterBodyPoints,
    );
  });

  it("requests focus for labelled-back image and title hit areas in both placements", () => {
    const { container, rerender } = render(
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

    const imageHitAreaBottom = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.imageMain}"]`,
    );
    const titleHitAreaBottom = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.title}"]`,
    );

    expect(imageHitAreaBottom).not.toBeNull();
    expect(titleHitAreaBottom).not.toBeNull();

    fireEvent.click(imageHitAreaBottom as Element);
    fireEvent.click(titleHitAreaBottom as Element);

    expect(mockRequestFocusTarget).toHaveBeenCalledWith(EDITOR_TARGET_IDS.imageMain);
    expect(mockRequestFocusTarget).toHaveBeenCalledWith(EDITOR_TARGET_IDS.title);

    rerender(
      <svg>
        <BlueprintRenderer
          templateId="labelled-back"
          templateName="Labelled Back"
          cardData={{
            title: "Lore Card",
            description: "Back text",
            imageAssetId: "art-5",
            titlePlacement: "top",
            showTitle: true,
          } as never}
        />
      </svg>,
    );

    const imageHitAreaTop = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.imageMain}"]`,
    );
    const titleHitAreaTop = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.title}"]`,
    );

    expect(imageHitAreaTop).not.toBeNull();
    expect(titleHitAreaTop).not.toBeNull();

    fireEvent.click(imageHitAreaTop as Element);
    fireEvent.click(titleHitAreaTop as Element);

    expect(mockRequestFocusTarget).toHaveBeenCalledWith(EDITOR_TARGET_IDS.imageMain);
    expect(mockRequestFocusTarget).toHaveBeenCalledWith(EDITOR_TARGET_IDS.title);
  });
});
