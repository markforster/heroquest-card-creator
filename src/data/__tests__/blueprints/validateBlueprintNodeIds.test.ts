import {
  blueprintIds,
  groupTypes,
  layerTypes,
  systemFamilies,
} from "@/data/card-systems/types";
import type { Blueprint } from "@/types/blueprints";

import {
  blueprintsByTemplateId,
  getBlueprintNodeReport,
  validateBlueprintNodeIds,
  validateBlueprintNodeIdsForSource,
} from "@/data/blueprints";

describe("validateBlueprintNodeIds", () => {
  it("accepts the current built-in blueprints", () => {
    expect(validateBlueprintNodeIds()).toEqual([]);
  });

  it("reports malformed ids", () => {
    const badBlueprint = {
      schemaVersion: 1,
      systemFamily: systemFamilies.hq_2021,
      templateId: "hero",
      canvas: { width: 750, height: 1050 },
      layers: [{ id: "title", type: layerTypes.title }],
    } as unknown as Blueprint;

    const issues = validateBlueprintNodeIdsForSource({ hero: badBlueprint });

    expect(issues).toEqual([
      expect.objectContaining({
        templateId: "hero",
        container: "layer",
        id: "title",
        message: "Blueprint node id must be fully qualified",
      }),
    ]);
  });

  it("reports duplicate ids within a blueprint", () => {
    const duplicateBlueprint: Blueprint = {
      schemaVersion: 1,
      systemFamily: systemFamilies.hq_2021,
      templateId: "monster",
      canvas: { width: 750, height: 1050 },
      layers: [{ id: blueprintIds.hq_2021_title_main, type: layerTypes.title }],
      groups: [
        {
          id: blueprintIds.hq_2021_group_monster_bottom_stack,
          type: groupTypes.stack,
          anchor: "bottom",
          direction: "up",
          origin: { x: 0, y: 0 },
          width: 100,
          gap: 0,
          children: [
            {
              id: blueprintIds.hq_2021_title_main,
              type: layerTypes.text,
              bind: { textKey: "description" },
            },
          ],
        },
      ],
    };

    const issues = validateBlueprintNodeIdsForSource({ monster: duplicateBlueprint });

    expect(issues).toEqual([
      expect.objectContaining({
        templateId: "monster",
        container: "group-child",
        id: "hq.2021.title.main",
        message: "Blueprint node id must be unique within a blueprint",
      }),
    ]);
  });
});

describe("getBlueprintNodeReport", () => {
  it("includes fully qualified entries for layers, groups, and group children", () => {
    const report = getBlueprintNodeReport();

    expect(report).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          templateId: "hero",
          container: "layer",
          id: "hq.2021.title.main",
          type: "title",
        }),
        expect.objectContaining({
          templateId: "hero",
          container: "group",
          id: "hq.2021.group.hero.bottom-stack",
          type: "stack",
        }),
        expect.objectContaining({
          templateId: "monster",
          container: "group-child",
          id: "hq.2021.icon.monster.primary",
        }),
      ]),
    );

    const legacyIds = ["title", "description", "monster-icon", "hero-bottom-stack"];
    const currentIds = report.map((entry) => entry.id);
    legacyIds.forEach((id) => {
      expect(currentIds).not.toContain(id);
    });

    expect(Object.keys(blueprintsByTemplateId).length).toBeGreaterThan(0);
  });

  it('carries the "hq.2021" system family on all current built-in blueprints', () => {
    Object.values(blueprintsByTemplateId).forEach((blueprint) => {
      expect(blueprint?.systemFamily).toBe(systemFamilies.hq_2021);
    });
  });
});
