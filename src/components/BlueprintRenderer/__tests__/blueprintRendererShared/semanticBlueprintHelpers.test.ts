import { findPrimaryTitleLayer, isPrimaryBodyTextLayer } from "@/components/BlueprintRenderer/blueprintRendererShared";
import { blueprintsByTemplateId } from "@/data/blueprints";

describe("semantic blueprint helpers", () => {
  it("finds the primary title layer without depending on legacy ids", () => {
    const blueprint = blueprintsByTemplateId.monster;
    if (!blueprint) {
      throw new Error("monster blueprint missing");
    }

    expect(findPrimaryTitleLayer(blueprint)?.id).toBe("hq.2021.title.main");
  });

  it("identifies the top-level body text layer semantically", () => {
    const blueprint = blueprintsByTemplateId["small-treasure"];
    if (!blueprint) {
      throw new Error("small-treasure blueprint missing");
    }

    const bodyLayer = blueprint.layers.find((entry) => isPrimaryBodyTextLayer(blueprint, entry));

    expect(bodyLayer?.id).toBe("hq.2021.text.body");
  });

  it("does not treat grouped body text blocks as the primary body text layer", () => {
    const blueprint = blueprintsByTemplateId.hero;
    if (!blueprint?.groups?.[0]) {
      throw new Error("hero grouped blueprint missing");
    }

    const groupChild = blueprint.groups[0].children.find((entry) => entry.bind?.textKey === "description");

    expect(groupChild).toBeDefined();
    expect(isPrimaryBodyTextLayer(blueprint, groupChild!)).toBe(false);
  });
});
