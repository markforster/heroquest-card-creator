import { blueprintsByTemplateId } from "@/data/blueprints";
import { layerTypes } from "@/data/card-systems/types";

function getCopyrightLayer(templateId: keyof typeof blueprintsByTemplateId) {
  const blueprint = blueprintsByTemplateId[templateId];
  expect(blueprint).toBeDefined();
  const layer = blueprint?.layers.find((entry) => entry.type === layerTypes.copyright);
  expect(layer).toBeDefined();
  return layer!;
}

describe("HQ 2021 copyright bounds", () => {
  it("uses the canonical 630 span for horizontal copyright templates", () => {
    const templateIds = [
      "hero",
      "monster",
      "small-treasure",
      "large-treasure",
      "hero-back",
      "rules",
      "labelled-back",
    ] as const;

    templateIds.forEach((templateId) => {
      expect(getCopyrightLayer(templateId).bounds?.width).toBe(630);
    });
  });

  it("keeps the approved labelled-back copyright placement", () => {
    expect(getCopyrightLayer("labelled-back").bounds).toEqual({
      x: 60,
      y: 998,
      width: 630,
      height: 22,
    });
  });

  it("uses the same canonical 630 span on the rotated axis for logo-back", () => {
    const layer = getCopyrightLayer("logo-back");
    expect(layer.bounds).toEqual({ x: 355, y: 514, width: 630, height: 22 });
    expect(layer.props).toEqual(
      expect.objectContaining({
        rotation: -90,
      }),
    );
  });
});
