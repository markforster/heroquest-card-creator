import { render } from "@testing-library/react";

import CardTextBlock from "@/components/Cards/CardParts/CardTextBlock";
import { mutateSvgForExport } from "@/components/Cards/CardPreview/cardPreviewExportSvg";
import { blueprintsByTemplateId } from "@/data/blueprints";

import { renderGroups } from "../blueprintRendererGroups";
import { TextLayer } from "../blueprintRendererText";

jest.mock("@/lib/text-fitting/measure", () => ({
  createTextMeasurer: (size: number) => (text: string) => (text.length * size) / 2,
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

describe("real list renderer integration", () => {
  it.each(["full", "fit-to-text"] as const)(
    "restarts numbered lists in %s backdrop segments",
    (fitMode) => {
      const blueprint = blueprintsByTemplateId["labelled-back"]!;
      const layer = blueprint.layers.find((entry) => entry.bind?.textKey === "description")!;
      const { container } = render(
        <svg>
          <TextLayer
            blueprint={blueprint}
            layer={layer}
            cardData={
              {
                description: "1. First\n2. Continue\n---\n4. Second\n1. Continue",
                imageAssetId: "qa",
                bodyTextStyle: { enabled: true, backdrop: { enabled: true, fitMode } },
              } as never
            }
          />
        </svg>,
      );
      expect(
        [...container.querySelectorAll("[data-list-marker]")].map((node) => node.textContent),
      ).toEqual(["1.", "2.", "4.", "5."]);
      expect(container.textContent).not.toContain("---");
    },
  );
  it("does not show later backdrop sections after horizontal clipping", () => {
    const blueprint = blueprintsByTemplateId["labelled-back"]!;
    const baseLayer = blueprint.layers.find((entry) => entry.bind?.textKey === "description")!;
    const layer = {
      ...baseLayer,
      bounds: { ...baseLayer.bounds!, width: 80 },
      props: { ...baseLayer.props, fontSize: 50 },
    };
    const { container } = render(
      <svg>
        <TextLayer
          blueprint={blueprint}
          layer={layer}
          cardData={
            {
              description: "- Blocked\n---\nLater",
              imageAssetId: "qa",
              bodyTextStyle: { enabled: true, backdrop: { enabled: true } },
            } as never
          }
        />
      </svg>,
    );
    expect(container.textContent).not.toContain("Later");
    expect(container.querySelector("[data-overflow-warning]")).not.toBeNull();
  });
  it.each(Object.keys(blueprintsByTemplateId))(
    "enables lists only in description layers: %s",
    (id) => {
      const blueprint = blueprintsByTemplateId[id as keyof typeof blueprintsByTemplateId];
      if (!blueprint) throw new Error("Missing blueprint");
      const layers = blueprint.layers.filter((layer) => layer.bind?.textKey === "description");
      for (const layer of layers) {
        const { container, unmount } = render(
          <svg>
            <TextLayer
              blueprint={blueprint}
              layer={layer}
              cardData={
                {
                  description: "- <b>Move</b>\n  - Door\n3. Attack\n1. End",
                  bodyTextStyle: { enabled: true },
                } as never
              }
            />
          </svg>,
        );
        expect(
          [...container.querySelectorAll("[data-list-marker]")].map((node) => node.textContent),
        ).toEqual(["•", "•", "3.", "4."]);
        unmount();
      }
    },
  );
  it.each(["hero", "monster"] as const)("uses real list rows in flexible %s groups", (id) => {
    const blueprint = blueprintsByTemplateId[id];
    if (!blueprint) throw new Error("Missing blueprint");
    const { container } = render(
      <svg>
        {renderGroups({
          blueprint,
          cardData: { description: "- Move\n  - Door" } as never,
          showTextBounds: false,
        })}
      </svg>,
    );
    expect(container.querySelectorAll("[data-list-marker]")).toHaveLength(2);
  });
  it("keeps non-description consumers literal by default", () => {
    const { container } = render(
      <svg>
        <CardTextBlock text="1. Credit" bounds={{ x: 0, y: 0, width: 200, height: 100 }} />
      </svg>,
    );
    expect(container.querySelector("[data-list-marker]")).toBeNull();
    expect(container.textContent).toBe("1. Credit");
  });
  it("keeps base marker style and exports SVG geometry without editing warnings", () => {
    const { container } = render(
      <svg>
        <CardTextBlock
          text={"- <color=#ff0000><b>Red</b></color>\n- Hidden"}
          enableLists
          showOverflowWarning
          fontSize={20}
          bounds={{ x: 0, y: 0, width: 200, height: 25 }}
        />
      </svg>,
    );
    const svg = container.querySelector("svg")!;
    expect(svg.querySelector("[data-list-marker]")?.getAttribute("fill")).toBe("#111111");
    expect(svg.querySelector("[data-list-marker]")?.getAttribute("style")).not.toContain("700");
    expect(svg.querySelector('[data-preview-only="overflow-warning"]')).not.toBeNull();
    expect(svg.textContent).not.toContain("Hidden");
    const marker = svg.querySelector("[data-list-marker]")!.outerHTML;
    mutateSvgForExport(svg, { mode: "standard" });
    expect(svg.querySelector('[data-preview-only="overflow-warning"]')).toBeNull();
    expect(svg.querySelector("[data-list-marker]")!.outerHTML).toBe(marker);
  });
});
