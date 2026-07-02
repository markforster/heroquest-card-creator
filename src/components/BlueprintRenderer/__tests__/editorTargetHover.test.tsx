import { act, fireEvent, render, screen } from "@testing-library/react";

import BlueprintRenderer from "@/components/BlueprintRenderer";
import {
  EDITOR_TARGET_IDS,
  EditorTargetsProvider,
  useEditorTargets,
} from "@/components/Cards/CardEditor/EditorTargetsContext";
import {
  getLabelledBackImageHoverInset,
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
    jest.runOnlyPendingTimers();
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
    expect(Number(imageHover.getAttribute("x"))).toBeGreaterThanOrEqual(0);
    expect(Number(imageHover.getAttribute("y"))).toBeGreaterThanOrEqual(0);
    expect(Number(imageHover.getAttribute("width"))).toBeGreaterThan(300);
    expect(Number(imageHover.getAttribute("height"))).toBeGreaterThan(250);

    const heroStatsTarget = container.querySelector(
      `[data-hqcc-edit="${EDITOR_TARGET_IDS.statsHero}"]`,
    ) as Element;
    fireEvent.pointerEnter(heroStatsTarget);
    const heroStatsHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.statsHero}"]`,
    ) as SVGRectElement;
    expect(Number(heroStatsHover.getAttribute("x"))).toBeGreaterThan(0);
    expect(Number(heroStatsHover.getAttribute("width"))).toBeGreaterThan(600);
    expect(Number(heroStatsHover.getAttribute("height"))).toBeGreaterThan(100);

    const copyrightTarget = container.querySelector(
      `[data-hqcc-edit="${EDITOR_TARGET_IDS.copyright}"]`,
    ) as Element;
    fireEvent.pointerEnter(copyrightTarget);
    const copyrightHover = container.querySelector(
      `[data-hqcc-hover-target="${EDITOR_TARGET_IDS.copyright}"]`,
    ) as SVGRectElement;
    expect(Number(copyrightHover.getAttribute("x"))).toBeGreaterThan(40);
    expect(Number(copyrightHover.getAttribute("y"))).toBeGreaterThan(900);
    expect(Number(copyrightHover.getAttribute("width"))).toBeGreaterThan(250);
    expect(Number(copyrightHover.getAttribute("height"))).toBeGreaterThan(20);
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

    fireEvent.click(hitArea);
    expect(screen.getByTestId("selected-target")).toHaveTextContent(EDITOR_TARGET_IDS.imageMain);
  });

  it("insets labelled-back artwork hover adornment while keeping the hit area full-card", () => {
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

    const inset = getLabelledBackImageHoverInset();
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
