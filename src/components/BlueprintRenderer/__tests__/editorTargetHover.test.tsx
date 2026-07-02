import { act, fireEvent, render, screen } from "@testing-library/react";

import BlueprintRenderer from "@/components/BlueprintRenderer";
import {
  EDITOR_TARGET_IDS,
  EditorTargetsProvider,
  useEditorTargets,
} from "@/components/Cards/CardEditor/EditorTargetsContext";
import {
  getImageHoverEdgeInset,
} from "@/components/BlueprintRenderer/blueprintRendererSimpleLayers";
import { CARD_WIDTH, sx, sy } from "@/config/card-canvas";

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
  useAssetImageUrl: (assetId?: string) => {
    const dimensionsByAssetId: Record<string, { width: number; height: number }> = {
      "art-1": { width: 750, height: 1050 },
      "art-2": { width: 750, height: 1050 },
      "art-3": { width: 506, height: 183 },
      "art-4": { width: 509, height: 359 },
      "art-6": { width: 750, height: 1050 },
      "icon-1": { width: 126, height: 126 },
      "icon-wide": { width: 200, height: 100 },
      "icon-tall": { width: 100, height: 200 },
    };

    const dimensions = assetId ? dimensionsByAssetId[assetId] : undefined;
    return {
      url: assetId && assetId !== "missing-icon" ? `asset://${assetId}` : null,
      status: assetId ? (assetId === "missing-icon" ? "missing" : "ready") : "missing",
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
    };
  },
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

function TargetStateProbe() {
  const { hoveredTargetId, selectedTargetId } = useEditorTargets();
  return (
    <>
      <output data-testid="hovered-target">{hoveredTargetId ?? "none"}</output>
      <output data-testid="selected-target">{selectedTargetId ?? "none"}</output>
    </>
  );
}

function renderWithTargets(ui: React.ReactNode) {
  return render(
    <EditorTargetsProvider>
      <TargetStateProbe />
      <svg>{ui}</svg>
    </EditorTargetsProvider>,
  );
}

describe("BlueprintRenderer SVG hover targets", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("sets and clears hover state while preserving click selection", () => {
    const { container } = renderWithTargets(
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
      />,
    );

    const titleTarget = container.querySelector(
      `[data-hqcc-edit="${EDITOR_TARGET_IDS.title}"]`,
    ) as Element;

    fireEvent.pointerEnter(titleTarget);
    const titleHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.title}"]`,
    ) as Element;
    expect(screen.getByTestId("hovered-target")).toHaveTextContent(EDITOR_TARGET_IDS.title);
    expect(titleHover).toHaveAttribute("data-hqcc-hover-visible", "true");

    fireEvent.click(titleTarget);
    expect(screen.getByTestId("selected-target")).toHaveTextContent(EDITOR_TARGET_IDS.title);

    fireEvent.pointerLeave(titleTarget);
    expect(screen.getByTestId("hovered-target")).toHaveTextContent(EDITOR_TARGET_IDS.title);
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(screen.getByTestId("hovered-target")).toHaveTextContent("none");
    const fadedTitleHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.title}"]`,
    ) as Element;
    expect(fadedTitleHover).toHaveAttribute("data-hqcc-hover-visible", "false");
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(
      container.querySelector(`[data-hqcc-hover-target="${EDITOR_TARGET_IDS.title}"]`),
    ).toBeNull();
  });

  it("switches immediately between targets while suppressing transient clear flicker", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="monster"
        templateName="Monster"
        cardData={{
          title: "Fimir",
          description: "Rules text",
          imageAssetId: "art-2",
          iconAssetId: "icon-1",
          showCopyright: false,
        } as never}
      />,
    );

    const statsTarget = container.querySelector(
      `[data-hqcc-edit="${EDITOR_TARGET_IDS.statsMonster}"]`,
    ) as Element;
    const imageTarget = container.querySelector(
      `[data-hqcc-edit="${EDITOR_TARGET_IDS.imageMain}"]`,
    ) as Element;
    const iconTarget = container.querySelector(
      `[data-hqcc-edit="${EDITOR_TARGET_IDS.imageIcon}"]`,
    ) as Element;

    fireEvent.pointerEnter(statsTarget);
    expect(screen.getByTestId("hovered-target")).toHaveTextContent(EDITOR_TARGET_IDS.statsMonster);
    expect(
      container.querySelector(`[data-hqcc-hover-target="${EDITOR_TARGET_IDS.statsMonster}"]`),
    ).toBeNull();

    fireEvent.pointerLeave(statsTarget);
    expect(screen.getByTestId("hovered-target")).toHaveTextContent(EDITOR_TARGET_IDS.statsMonster);

    fireEvent.pointerEnter(imageTarget);
    expect(screen.getByTestId("hovered-target")).toHaveTextContent(EDITOR_TARGET_IDS.imageMain);

    fireEvent.pointerLeave(imageTarget);
    fireEvent.pointerEnter(iconTarget);
    expect(screen.getByTestId("hovered-target")).toHaveTextContent(EDITOR_TARGET_IDS.imageIcon);

    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(screen.getByTestId("hovered-target")).toHaveTextContent(EDITOR_TARGET_IDS.imageIcon);
  });

  it("shows only the hovered monster stat cell border", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="monster"
        templateName="Monster"
        cardData={{
          title: "Fimir",
          description: "Rules text",
          imageAssetId: "art-2",
          showCopyright: false,
        } as never}
      />,
    );

    const panelHitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.statsMonster}"]`,
    ) as SVGRectElement;
    const bodyHitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.statsMonsterBodyPoints}"]`,
    ) as SVGRectElement;

    fireEvent.pointerEnter(panelHitArea);
    expect(
      container.querySelector(`[data-hqcc-hover-target="${EDITOR_TARGET_IDS.statsMonster}"]`),
    ).toBeNull();

    fireEvent.pointerLeave(panelHitArea);
    fireEvent.pointerEnter(bodyHitArea);
    const cellHoverShapes = container.querySelectorAll(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.statsMonsterBodyPoints}"]`,
    );
    expect(screen.getByTestId("hovered-target")).toHaveTextContent(
      EDITOR_TARGET_IDS.statsMonsterBodyPoints,
    );
    expect(cellHoverShapes).toHaveLength(1);
    expect(
      container.querySelectorAll(
        `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.statsMonsterBodyPoints}"][data-hqcc-hover-tone="active"]`,
      ),
    ).toHaveLength(1);
    const monsterActiveCell = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.statsMonsterBodyPoints}"][data-hqcc-hover-tone="active"]`,
    ) as SVGRectElement;
    expect(Number(monsterActiveCell.getAttribute("x"))).toBeLessThan(466);
  });

  it("shows only the hovered hero stat cell border", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="hero"
        templateName="Hero"
        cardData={{
          title: "Sir Ragnar",
          description: "Body text",
          imageAssetId: "art-1",
          showCopyright: false,
        } as never}
      />,
    );

    const panelHitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.statsHero}"]`,
    ) as SVGRectElement;
    const mindHitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.statsHeroMindPoints}"]`,
    ) as SVGRectElement;

    fireEvent.pointerEnter(panelHitArea);
    expect(
      container.querySelector(`[data-hqcc-hover-target="${EDITOR_TARGET_IDS.statsHero}"]`),
    ).toBeNull();

    fireEvent.pointerLeave(panelHitArea);
    fireEvent.pointerEnter(mindHitArea);
    const cellHoverShapes = container.querySelectorAll(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.statsHeroMindPoints}"]`,
    );
    expect(screen.getByTestId("hovered-target")).toHaveTextContent(
      EDITOR_TARGET_IDS.statsHeroMindPoints,
    );
    expect(cellHoverShapes).toHaveLength(1);
    expect(
      container.querySelectorAll(
        `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.statsHeroMindPoints}"][data-hqcc-hover-tone="active"]`,
      ),
    ).toHaveLength(1);
    const heroActiveCell = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.statsHeroMindPoints}"][data-hqcc-hover-tone="active"]`,
    ) as SVGRectElement;
    expect(Number(heroActiveCell.getAttribute("x"))).toBeLessThan(547);
  });

  it("uses fitted icon image bounds for square icon hover adornment", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="monster"
        templateName="Monster"
        cardData={{
          title: "Fimir",
          description: "Rules text",
          imageAssetId: "art-2",
          iconAssetId: "icon-1",
          showCopyright: false,
        } as never}
      />,
    );

    const hitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.imageIcon}"]`,
    ) as SVGRectElement;
    expect(hitArea).not.toBeNull();

    fireEvent.pointerEnter(hitArea);
    const iconHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.imageIcon}"]`,
    ) as SVGRectElement;
    expect(iconHover.getAttribute("width")).toBe(hitArea.getAttribute("width"));
    expect(iconHover.getAttribute("height")).toBe(hitArea.getAttribute("height"));
  });

  it("shrinks non-square icon hover adornment to the fitted image footprint", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="monster"
        templateName="Monster"
        cardData={{
          title: "Fimir",
          description: "Rules text",
          imageAssetId: "art-2",
          iconAssetId: "icon-wide",
          showCopyright: false,
        } as never}
      />,
    );

    const hitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.imageIcon}"]`,
    ) as SVGRectElement;

    fireEvent.pointerEnter(hitArea);
    const iconHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.imageIcon}"]`,
    ) as SVGRectElement;
    expect(hitArea).not.toBe(iconHover);
    expect(Number(iconHover.getAttribute("width"))).toBeGreaterThan(Number(iconHover.getAttribute("height")));
    expect(Number(iconHover.getAttribute("height"))).toBeLessThan(Number(hitArea.getAttribute("height")));
    expect(Number(iconHover.getAttribute("width"))).toBe(Number(hitArea.getAttribute("width")));
  });

  it("scales icon hover adornment with the rendered icon image", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="monster"
        templateName="Monster"
        cardData={{
          title: "Fimir",
          description: "Rules text",
          imageAssetId: "art-2",
          iconAssetId: "icon-tall",
          iconScale: 1.5,
          showCopyright: false,
        } as never}
      />,
    );

    const hitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.imageIcon}"]`,
    ) as SVGRectElement;

    fireEvent.pointerEnter(hitArea);
    const iconHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.imageIcon}"]`,
    ) as SVGRectElement;
    expect(Number(iconHover.getAttribute("height"))).toBeGreaterThan(Number(hitArea.getAttribute("height")));
    expect(Number(iconHover.getAttribute("width"))).toBeLessThan(Number(iconHover.getAttribute("height")));
  });

  it("keeps missing icon hover adornment on the full slot bounds", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="monster"
        templateName="Monster"
        cardData={{
          title: "Fimir",
          description: "Rules text",
          imageAssetId: "art-2",
          iconAssetId: "missing-icon",
          showCopyright: false,
        } as never}
      />,
    );

    const hitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.imageIcon}"]`,
    ) as SVGRectElement;

    fireEvent.pointerEnter(hitArea);
    const iconHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.imageIcon}"]`,
    ) as SVGRectElement;
    expect(iconHover.getAttribute("x")).toBe(hitArea.getAttribute("x"));
    expect(iconHover.getAttribute("y")).toBe(hitArea.getAttribute("y"));
    expect(iconHover.getAttribute("width")).toBe(hitArea.getAttribute("width"));
    expect(iconHover.getAttribute("height")).toBe(hitArea.getAttribute("height"));
  });

  it("uses an authored-region hit area for hero body text instead of glyph-only interaction", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="hero"
        templateName="Hero"
        cardData={{
          title: "Sir Ragnar",
          description: "Body text",
          imageAssetId: "art-1",
          showCopyright: false,
        } as never}
      />,
    );

    const hitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.textMain}"]`,
    ) as SVGRectElement;

    expect(hitArea).not.toBeNull();

    fireEvent.pointerEnter(hitArea);
    const textHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.textMain}"]`,
    ) as SVGElement;
    expect(screen.getByTestId("hovered-target")).toHaveTextContent(EDITOR_TARGET_IDS.textMain);
    expect(textHover).toHaveAttribute("data-hqcc-hover-visible", "true");
    expect(Number(textHover.getAttribute("x"))).toBe(Number(hitArea.getAttribute("x")) - 16);
    expect(Number(textHover.getAttribute("y"))).toBe(Number(hitArea.getAttribute("y")) - 16);
    expect(Number(textHover.getAttribute("width"))).toBe(Number(hitArea.getAttribute("width")) + 32);
    expect(Number(textHover.getAttribute("height"))).toBe(
      Number(hitArea.getAttribute("height")) + 32,
    );

    fireEvent.click(hitArea);
    expect(screen.getByTestId("selected-target")).toHaveTextContent(EDITOR_TARGET_IDS.textMain);
  });

  it("does not expose hero body text interaction when the description is empty", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="hero"
        templateName="Hero"
        cardData={{
          title: "Sir Ragnar",
          description: "",
          imageAssetId: "art-1",
          showCopyright: false,
        } as never}
      />,
    );

    expect(
      container.querySelector(`[data-hqcc-hit-area="${EDITOR_TARGET_IDS.textMain}"]`),
    ).toBeNull();
  });

  it("does not expose monster body text interaction when the description is empty", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="monster"
        templateName="Monster"
        cardData={{
          title: "Fimir",
          description: "",
          imageAssetId: "art-2",
          showCopyright: false,
        } as never}
      />,
    );

    expect(
      container.querySelector(`[data-hqcc-hit-area="${EDITOR_TARGET_IDS.textMain}"]`),
    ).toBeNull();
  });

  it("renders a single-line hero description high enough to remain visible above the bottom stack floor", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="hero"
        templateName="Hero"
        cardData={{
          title: "Sir Ragnar",
          description: "Single line",
          imageAssetId: "art-1",
          showCopyright: false,
        } as never}
      />,
    );

    const textNode = Array.from(container.querySelectorAll("text")).find(
      (node) => node.textContent === "Single line",
    ) as SVGTextElement | undefined;

    expect(textNode).toBeDefined();
    expect(Number(textNode?.getAttribute("y"))).toBeLessThan(998);
  });

  it("renders a single-line monster description high enough to remain visible above the bottom stack floor", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="monster"
        templateName="Monster"
        cardData={{
          title: "Fimir",
          description: "Single line",
          imageAssetId: "art-2",
          showCopyright: false,
        } as never}
      />,
    );

    const textNode = Array.from(container.querySelectorAll("text")).find(
      (node) => node.textContent === "Single line",
    ) as SVGTextElement | undefined;

    expect(textNode).toBeDefined();
    expect(Number(textNode?.getAttribute("y"))).toBeLessThan(998);
  });

  it("keeps fixed-bounds body text hoverable when the description is empty", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="small-treasure"
        templateName="Small Treasure"
        cardData={{
          title: "Potion",
          description: "",
          imageAssetId: "art-3",
          showCopyright: false,
        } as never}
      />,
    );

    const hitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.textMain}"]`,
    ) as SVGRectElement;

    expect(hitArea).not.toBeNull();

    fireEvent.pointerEnter(hitArea);
    expect(screen.getByTestId("hovered-target")).toHaveTextContent(EDITOR_TARGET_IDS.textMain);
    const textHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.textMain}"]`,
    ) as SVGRectElement;
    expect(Number(textHover.getAttribute("x"))).toBe(Number(hitArea.getAttribute("x")) - 16);
    expect(Number(textHover.getAttribute("y"))).toBe(Number(hitArea.getAttribute("y")) - 16);
    expect(Number(textHover.getAttribute("width"))).toBe(Number(hitArea.getAttribute("width")) + 32);
    expect(Number(textHover.getAttribute("height"))).toBe(
      Number(hitArea.getAttribute("height")) + 32,
    );

    fireEvent.click(hitArea);
    expect(screen.getByTestId("selected-target")).toHaveTextContent(EDITOR_TARGET_IDS.textMain);
  });

  it("renders title, artwork, hero stats, and copyright hover layers against authored bounds", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="hero"
        templateName="Hero"
        cardData={{
          title: "Hero Title",
          description: "Body text",
          imageAssetId: "art-1",
          copyright: "Hero Copyright",
          showCopyright: true,
        } as never}
      />,
    );

    const titleTarget = container.querySelector(
      `[data-hqcc-edit="${EDITOR_TARGET_IDS.title}"]`,
    ) as Element;
    fireEvent.pointerEnter(titleTarget);

    const titleHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.title}"]`,
    ) as SVGRectElement;
    expect(Number(titleHover.getAttribute("x"))).toBeGreaterThan(50);
    expect(Number(titleHover.getAttribute("y"))).toBeGreaterThan(20);
    expect(Number(titleHover.getAttribute("width"))).toBeGreaterThan(550);
    expect(Number(titleHover.getAttribute("height"))).toBeGreaterThan(120);

    const imageTarget = container.querySelector(
      `[data-hqcc-edit="${EDITOR_TARGET_IDS.imageMain}"]`,
    ) as Element;
    fireEvent.pointerEnter(imageTarget);
    const imageHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.imageMain}"]`,
    ) as SVGRectElement;
    expect(imageHover).toHaveAttribute("x", "18");
    expect(imageHover).toHaveAttribute("y", "120");
    expect(imageHover).toHaveAttribute("width", "714");
    expect(imageHover).toHaveAttribute("height", "730");

    const heroStatsTarget = container.querySelector(
      `[data-hqcc-edit="${EDITOR_TARGET_IDS.statsHero}"]`,
    ) as Element;
    fireEvent.pointerEnter(heroStatsTarget);
    expect(
      container.querySelector(`[data-hqcc-hover-target="${EDITOR_TARGET_IDS.statsHero}"]`),
    ).toBeNull();

    const copyrightTarget = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.copyright}"]`,
    ) as SVGRectElement;
    expect(copyrightTarget).not.toBeNull();
    fireEvent.pointerEnter(copyrightTarget);
    const copyrightHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.copyright}"]`,
    ) as SVGRectElement;
    expect(Number(copyrightHover.getAttribute("x"))).toBeGreaterThan(40);
    expect(Number(copyrightHover.getAttribute("y"))).toBeGreaterThan(900);
    expect(Number(copyrightHover.getAttribute("width"))).toBeGreaterThan(250);
    expect(Number(copyrightHover.getAttribute("height"))).toBeGreaterThan(20);
  });

  it("adds vertical-only hover breathing room for plain titles without widening them", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="small-treasure"
        templateName="Small Treasure"
        cardData={{
          title: "Haunted Mirror",
          description: "Treasure text",
          imageAssetId: "art-3",
          showCopyright: false,
        } as never}
      />,
    );

    const titleTarget = container.querySelector(
      `[data-hqcc-edit="${EDITOR_TARGET_IDS.title}"]`,
    ) as SVGElement;
    expect(titleTarget).not.toBeNull();

    fireEvent.pointerEnter(titleTarget);
    const titleHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.title}"]`,
    ) as SVGRectElement;

    expect(titleHover).not.toBeNull();
    expect(Number(titleHover.getAttribute("x"))).toBeCloseTo(81, 0);
    expect(Number(titleHover.getAttribute("width"))).toBeCloseTo(588, 0);
    expect(Number(titleHover.getAttribute("y"))).toBeLessThan(82);
    expect(Number(titleHover.getAttribute("height"))).toBeGreaterThan(80);
  });

  it("adds top-edge breathing room for ribbon titles without widening them", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="hero"
        templateName="Hero"
        cardData={{
          title: "Warden",
          description: "Body text",
          imageAssetId: "art-1",
          showCopyright: false,
        } as never}
      />,
    );

    const titleTarget = container.querySelector(
      `[data-hqcc-edit="${EDITOR_TARGET_IDS.title}"]`,
    ) as SVGElement;
    expect(titleTarget).not.toBeNull();

    fireEvent.pointerEnter(titleTarget);
    const titleHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.title}"]`,
    ) as SVGRectElement;

    expect(titleHover).not.toBeNull();
    expect(Number(titleHover.getAttribute("x"))).toBeCloseTo(76, 0);
    expect(Number(titleHover.getAttribute("width"))).toBeCloseTo(598, 0);
    expect(Number(titleHover.getAttribute("y"))).toBeLessThan(45);
    expect(Number(titleHover.getAttribute("height"))).toBeGreaterThan(154);
  });

  it("omits optional icon and copyright hover layers when those targets are absent", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="monster"
        templateName="Monster"
        cardData={{
          title: "Fimir",
          description: "Rules text",
          imageAssetId: "art-2",
          showCopyright: false,
        } as never}
      />,
    );

    expect(
      container.querySelector(`[data-hqcc-hover-target="${EDITOR_TARGET_IDS.imageIcon}"]`),
    ).toBeNull();
    expect(
      container.querySelector(`[data-hqcc-hover-target="${EDITOR_TARGET_IDS.copyright}"]`),
    ).toBeNull();
  });

  it("renders distinct small treasure artwork hit area and hover adornment", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="small-treasure"
        templateName="Small Treasure"
        cardData={{
          title: "Potion",
          description: "Restore one Body Point.",
          imageAssetId: "art-3",
          showCopyright: false,
        } as never}
      />,
    );

    const hitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.imageMain}"]`,
    ) as SVGRectElement;

    expect(hitArea).not.toBeNull();
    expect(hitArea).toHaveAttribute("x", "122");
    expect(hitArea).toHaveAttribute("y", "166");
    expect(hitArea).toHaveAttribute("width", "506");
    expect(hitArea).toHaveAttribute("height", "183");

    fireEvent.pointerEnter(hitArea);
    const adornment = container.querySelector(`[data-hqcc-hover-overlay="true"]`) as SVGGElement;
    const imageHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.imageMain}"]`,
    ) as SVGRectElement;
    expect(adornment).not.toBeNull();
    expect(hitArea).not.toBe(imageHover);
    expect(adornment.contains(imageHover)).toBe(true);
    expect(screen.getByTestId("hovered-target")).toHaveTextContent(EDITOR_TARGET_IDS.imageMain);
    expect(imageHover).toHaveAttribute("data-hqcc-hover-visible", "true");
    expect(imageHover).toHaveAttribute("x", "106");
    expect(imageHover).toHaveAttribute("y", "150");
    expect(imageHover).toHaveAttribute("width", "538");
    expect(imageHover).toHaveAttribute("height", "215");

    fireEvent.click(hitArea);
    expect(screen.getByTestId("selected-target")).toHaveTextContent(EDITOR_TARGET_IDS.imageMain);
  });

  it("renders distinct large treasure artwork hit area and hover adornment", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="large-treasure"
        templateName="Large Treasure"
        cardData={{
          title: "Ancient Relic",
          description: "A powerful artefact.",
          imageAssetId: "art-4",
          showCopyright: false,
        } as never}
      />,
    );

    const hitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.imageMain}"]`,
    ) as SVGRectElement;

    expect(hitArea).not.toBeNull();
    expect(hitArea).toHaveAttribute("x", "123");
    expect(hitArea).toHaveAttribute("y", "167");
    expect(hitArea).toHaveAttribute("width", "509");
    expect(hitArea).toHaveAttribute("height", "359");

    fireEvent.pointerEnter(hitArea);
    const adornment = container.querySelector(`[data-hqcc-hover-overlay="true"]`) as SVGGElement;
    const imageHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.imageMain}"]`,
    ) as SVGRectElement;
    expect(adornment).not.toBeNull();
    expect(hitArea).not.toBe(imageHover);
    expect(adornment.contains(imageHover)).toBe(true);
    expect(screen.getByTestId("hovered-target")).toHaveTextContent(EDITOR_TARGET_IDS.imageMain);
    expect(imageHover).toHaveAttribute("data-hqcc-hover-visible", "true");
    expect(imageHover).toHaveAttribute("x", "107");
    expect(imageHover).toHaveAttribute("y", "151");
    expect(imageHover).toHaveAttribute("width", "541");
    expect(imageHover).toHaveAttribute("height", "391");

    fireEvent.click(hitArea);
    expect(screen.getByTestId("selected-target")).toHaveTextContent(EDITOR_TARGET_IDS.imageMain);
  });

  it("uses canvas-clipped visible artwork bounds for hero hover adornment and insets touched edges", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="hero"
        templateName="Hero"
        cardData={{
          title: "Sir Ragnar",
          description: "Body text",
          imageAssetId: "art-1",
          imageOriginalWidth: 750,
          imageOriginalHeight: 1050,
          imageScaleMode: "absolute",
          imageScale: 1,
          showCopyright: false,
        } as never}
      />,
    );

    const inset = getImageHoverEdgeInset();
    const hitArea = container.querySelector(
      `[data-hqcc-edit="${EDITOR_TARGET_IDS.imageMain}"]`,
    ) as SVGElement;

    expect(hitArea).not.toBeNull();

    fireEvent.pointerEnter(hitArea);
    const imageHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.imageMain}"]`,
    ) as SVGRectElement;
    expect(imageHover).toHaveAttribute("x", `${inset}`);
    expect(imageHover).toHaveAttribute("y", `${inset}`);
    expect(imageHover).toHaveAttribute("width", `${750 - inset * 2}`);
    expect(imageHover).toHaveAttribute("height", "992");
  });

  it("clamps near-edge canvas-clipped artwork hover bounds per edge without insetting every side", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="hero"
        templateName="Hero"
        cardData={{
          title: "Sir Ragnar",
          description: "Body text",
          imageAssetId: "art-1",
          imageOriginalWidth: 750,
          imageOriginalHeight: 1050,
          imageScaleMode: "absolute",
          imageScale: 0.6,
          imageOffsetX: 140,
          showCopyright: false,
        } as never}
      />,
    );

    const inset = getImageHoverEdgeInset();
    const hitArea = container.querySelector(
      `[data-hqcc-edit="${EDITOR_TARGET_IDS.imageMain}"]`,
    ) as SVGElement;

    expect(hitArea).not.toBeNull();

    fireEvent.pointerEnter(hitArea);
    const imageHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.imageMain}"]`,
    ) as SVGRectElement;
    expect(imageHover).toHaveAttribute("x", "290");
    expect(imageHover).toHaveAttribute("y", "170");
    expect(imageHover).toHaveAttribute("width", `${732 - 290}`);
    expect(imageHover).toHaveAttribute("height", "630");
    expect(Number(imageHover.getAttribute("x"))).toBeGreaterThan(inset);
    expect(Number(imageHover.getAttribute("x")) + Number(imageHover.getAttribute("width"))).toBe(
      750 - inset,
    );
  });

  it("insets canvas-clipped full-card artwork hover adornment while keeping the hit area full-card", () => {
    const { container } = renderWithTargets(
      <BlueprintRenderer
        templateId="labelled-back"
        templateName="Labelled Back"
        cardData={{
          title: "Lore Card",
          description: "Back text",
          imageAssetId: "art-6",
          titlePlacement: "top",
          showTitle: true,
        } as never}
      />,
    );

    const inset = getImageHoverEdgeInset();
    const hitArea = container.querySelector(
      `[data-hqcc-hit-area="${EDITOR_TARGET_IDS.imageMain}"]`,
    ) as SVGRectElement;

    expect(hitArea).toHaveAttribute("x", "0");
    expect(hitArea).toHaveAttribute("y", "0");
    expect(hitArea).toHaveAttribute("width", "750");
    expect(hitArea).toHaveAttribute("height", "1050");

    fireEvent.pointerEnter(hitArea);
    const overlay = container.querySelector(`[data-hqcc-hover-overlay="true"]`) as SVGGElement;
    const imageHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.imageMain}"]`,
    ) as SVGRectElement;
    expect(overlay).not.toBeNull();
    expect(imageHover).toHaveAttribute("x", `${inset}`);
    expect(imageHover).toHaveAttribute("y", `${inset}`);
    expect(imageHover).toHaveAttribute("width", `${750 - inset * 2}`);
    expect(imageHover).toHaveAttribute("height", `${1050 - inset * 2}`);
    expect(imageHover).toHaveAttribute("data-hqcc-hover-visible", "true");
  });

  it("rerenders across different card shapes without hook-order crashes", () => {
    const { rerender, container } = renderWithTargets(
      <BlueprintRenderer
        templateId="hero"
        templateName="Hero"
        cardData={{
          title: "Sir Ragnar",
          description: "Body text",
          imageAssetId: "art-1",
          showCopyright: false,
        } as never}
      />,
    );

    rerender(
      <EditorTargetsProvider>
        <TargetStateProbe />
        <svg>
          <BlueprintRenderer
            templateId="labelled-back"
            templateName="Labelled Back"
            cardData={{
              title: "Lore Card",
              description: "Back text",
              imageAssetId: "art-6",
              titlePlacement: "top",
              showTitle: true,
            } as never}
          />
        </svg>
      </EditorTargetsProvider>,
    );

    rerender(
      <EditorTargetsProvider>
        <TargetStateProbe />
        <svg>
          <BlueprintRenderer
            templateId="small-treasure"
            templateName="Small Treasure"
            cardData={{
              title: "Potion",
              description: "Restore one Body Point.",
              imageAssetId: "art-3",
              showCopyright: false,
            } as never}
          />
        </svg>
      </EditorTargetsProvider>,
    );

    expect(container.querySelector("[data-hqcc-hover-overlay='true']")).toBeNull();
  });
});
