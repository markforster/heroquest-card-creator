import { fireEvent, render } from "@testing-library/react";

import BlueprintRenderer from "@/components/BlueprintRenderer";
import { EDITOR_TARGET_IDS } from "@/components/Cards/CardEditor/EditorTargetsContext";

const mockRequestFocusTarget = jest.fn();
const mockUseHeroBackLogoImageUrl = jest.fn(() => ({
  url: null as string | null,
  status: "idle",
  width: null as number | null,
  height: null as number | null,
}));

jest.mock("@/components/Cards/CardEditor/EditorTargetsContext", () => ({
  EDITOR_TARGET_IDS: {
    title: "title",
    imageMain: "image.main",
    imageIcon: "image.icon",
    heroBackLogo: "heroBack.logo",
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

jest.mock("@/hooks/useHeroBackLogoImageUrl", () => ({
  useHeroBackLogoImageUrl: () => mockUseHeroBackLogoImageUrl(),
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
    mockUseHeroBackLogoImageUrl.mockReturnValue({
      url: null,
      status: "idle",
      width: null,
      height: null,
    });
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

  it("requests focus for the Hero Back logo hit area", () => {
    const { container } = render(
      <svg>
        <BlueprintRenderer
          templateId="hero-back"
          templateName="Hero Back"
          cardData={{
            description: "Body text",
            showCopyright: false,
          } as never}
        />
      </svg>,
    );

    const logoHitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.heroBackLogo}"]`,
    );

    expect(logoHitArea).not.toBeNull();
    fireEvent.click(logoHitArea as Element);
    expect(mockRequestFocusTarget).toHaveBeenCalledWith(EDITOR_TARGET_IDS.heroBackLogo);
  });

  it("renders Logo Back with an anticlockwise stock logo and matching hit bounds", () => {
    const { container } = render(
      <svg>
        <BlueprintRenderer
          templateId="logo-back"
          templateName="Logo Back"
          cardData={{ heroBackLogoMode: "default" } as never}
        />
      </svg>,
    );

    const logo = container.querySelector('image[data-template-asset="hero-back-logo"]');
    const hitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.heroBackLogo}"]`,
    );

    expect(logo).toHaveAttribute("x", "0");
    expect(logo).toHaveAttribute("y", "0");
    expect(logo).toHaveAttribute("width", "1");
    expect(Number(logo?.getAttribute("height"))).toBeGreaterThan(0);
    expect(Number(logo?.getAttribute("height"))).toBeLessThanOrEqual(1);
    expect(logo?.getAttribute("transform")).toMatch(
      /^translate\(379 519\) rotate\(-90\) scale\(.+\) translate\(/,
    );
    expect(hitArea).toHaveAttribute("x", "218");
    expect(hitArea).toHaveAttribute("y", "70");
    expect(hitArea).toHaveAttribute("width", "322");
    expect(hitArea).toHaveAttribute("height", "898");
  });

  it("preserves horizontal Hero Back logo rendering", () => {
    const { container } = render(
      <svg>
        <BlueprintRenderer
          templateId="hero-back"
          templateName="Hero Back"
          cardData={{ heroBackLogoMode: "default" } as never}
        />
      </svg>,
    );

    const logo = container.querySelector('image[data-template-asset="hero-back-logo"]');
    expect(logo).not.toHaveAttribute("transform");
    expect(Number(logo?.getAttribute("x"))).toBeGreaterThanOrEqual(0);
  });

  it("rotates custom Logo Back logos and supports hiding the logo", () => {
    mockUseHeroBackLogoImageUrl.mockReturnValue({
      url: "asset://logo-1",
      status: "ready",
      width: 300,
      height: 100,
    });
    const { container, rerender } = render(
      <svg>
        <BlueprintRenderer
          templateId="logo-back"
          templateName="Logo Back"
          cardData={{
            heroBackLogoMode: "custom",
            heroBackLogoId: "logo-1",
            heroBackLogoName: "Custom Logo",
          } as never}
        />
      </svg>,
    );

    const customLogo = container.querySelector('image[data-user-hero-back-logo-id="logo-1"]');
    expect(customLogo).toHaveAttribute("x", "0");
    expect(customLogo).toHaveAttribute("y", "0");
    expect(customLogo).toHaveAttribute("width", "1");
    expect(customLogo).toHaveAttribute("height", String(1 / 3));
    expect(customLogo?.getAttribute("transform")).toMatch(
      /^translate\(379 519\) rotate\(-90\) scale\(/,
    );

    rerender(
      <svg>
        <BlueprintRenderer
          templateId="logo-back"
          templateName="Logo Back"
          cardData={{ heroBackLogoMode: "none" } as never}
        />
      </svg>,
    );
    expect(container.querySelector('image[data-template-asset="hero-back-logo"]')).toBeNull();
    expect(container.querySelector('image[data-user-hero-back-logo-id]')).toBeNull();
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

  it("requests focus from the full inset Rules text hit area", () => {
    const { container } = render(
      <svg>
        <BlueprintRenderer
          templateId="rules"
          templateName="Rules"
          cardData={{ description: "**Movement**\nMove around the board." }}
        />
      </svg>,
    );

    const hitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.textMain}"]`,
    );
    expect(hitArea).toHaveAttribute("x", "45");
    expect(hitArea).toHaveAttribute("y", "55");
    expect(hitArea).toHaveAttribute("width", "660");
    expect(hitArea).toHaveAttribute("height", "955");

    fireEvent.click(hitArea as Element);
    expect(mockRequestFocusTarget).toHaveBeenCalledWith(EDITOR_TARGET_IDS.textMain);
  });
});
