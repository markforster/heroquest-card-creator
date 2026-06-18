import {
  blueprintIds,
  groupTypes,
  layerTypes,
  systemFamilies,
} from "@/data/card-systems/types";
import { blueprintsByTemplateId } from "@/data/blueprints";

const FULLY_QUALIFIED_BLUEPRINT_ID_PATTERN = /^hq\.\d{4}\.[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;

describe("card system registries", () => {
  it("defines unique fully qualified blueprint ids", () => {
    const values = Object.values(blueprintIds);

    expect(new Set(values).size).toBe(values.length);
    values.forEach((value) => {
      expect(value).toMatch(FULLY_QUALIFIED_BLUEPRINT_ID_PATTERN);
    });
  });

  it("defines the current blueprint layer and group type sets", () => {
    expect(Object.values(layerTypes)).toEqual(
      expect.arrayContaining([
        "background",
        "border",
        "image",
        "text",
        "title",
        "overlay",
        "icon",
        "stats-hero",
        "stats-monster",
        "copyright",
      ]),
    );
    expect(Object.values(groupTypes)).toEqual(["stack"]);
    expect(Object.values(systemFamilies)).toEqual(["hq.2021"]);
    expect(new Set(Object.values(systemFamilies)).size).toBe(Object.values(systemFamilies).length);
  });

  it("covers all ids and node types used by the current built-in blueprints", () => {
    const allowedIds = new Set(Object.values(blueprintIds));
    const allowedLayerTypes = new Set(Object.values(layerTypes));
    const allowedGroupTypes = new Set(Object.values(groupTypes));

    Object.values(blueprintsByTemplateId).forEach((blueprint) => {
      if (!blueprint) return;

      blueprint.layers.forEach((layer) => {
        expect(allowedIds.has(layer.id)).toBe(true);
        expect(allowedLayerTypes.has(layer.type)).toBe(true);
      });

      blueprint.groups?.forEach((group) => {
        expect(allowedIds.has(group.id)).toBe(true);
        expect(allowedGroupTypes.has(group.type)).toBe(true);

        group.children.forEach((child) => {
          expect(allowedIds.has(child.id)).toBe(true);
          expect(allowedLayerTypes.has(child.type)).toBe(true);
        });
      });

      expect(blueprint.systemFamily).toBe(systemFamilies.hq_2021);
    });
  });
});
