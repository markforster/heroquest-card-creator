import { render } from "@testing-library/react";

import { renderBackgroundLayer } from "@/components/BlueprintRenderer/blueprintRendererSimpleLayers";
import { blueprintsByTemplateId } from "@/data/blueprints";
import { layerTypes } from "@/data/card-systems/types";
import type { Blueprint } from "@/types/blueprints";

const background = {
  src: "/background.png",
  width: 756,
  height: 1056,
} as const;

function getHeroBlueprint(): Blueprint {
  const blueprint = blueprintsByTemplateId.hero;
  if (!blueprint) throw new Error("hero blueprint missing");
  return blueprint;
}

describe("background tint blend mode rendering", () => {
  it("defaults the tint overlay to multiply when no blend mode is set", () => {
    const blueprint = getHeroBlueprint();
    const layer = blueprint.layers.find((entry) => entry.type === layerTypes.background);
    if (!layer) throw new Error("hero background layer missing");

    const { container } = render(
      <svg>
        {renderBackgroundLayer({
          blueprint,
          layer,
          background,
          cardData: { backgroundTint: "#FFFFFF" } as never,
        })}
      </svg>,
    );

    const tintOverlay = container.querySelector("rect[fill='#FFFFFF']");
    expect(tintOverlay).toHaveStyle({ mixBlendMode: "multiply" });
  });

  it("uses the selected tint blend mode on the tint overlay", () => {
    const blueprint = getHeroBlueprint();
    const layer = blueprint.layers.find((entry) => entry.type === layerTypes.background);
    if (!layer) throw new Error("hero background layer missing");

    const { container } = render(
      <svg>
        {renderBackgroundLayer({
          blueprint,
          layer,
          background,
          cardData: {
            backgroundTint: "#FFFFFF",
            backgroundTintBlendMode: "screen",
          } as never,
        })}
      </svg>,
    );

    const tintOverlay = container.querySelector("rect[fill='#FFFFFF']");
    expect(tintOverlay).toHaveStyle({ mixBlendMode: "screen" });
  });
});
