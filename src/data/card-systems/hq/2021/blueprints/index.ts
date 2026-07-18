import type { Blueprint, BlueprintBounds, BlueprintLayer } from "@/types/blueprints";
import type { TemplateId } from "@/types/templates";

import { HERO_BACK_BLUEPRINT } from "./hero-back";
import { HERO_BLUEPRINT } from "./hero";
import { LABELLED_BACK_BLUEPRINT } from "./labelled-back";
import { LARGE_TREASURE_BLUEPRINT } from "./large-treasure";
import { LOGO_BACK_BLUEPRINT } from "./logo-back";
import { MONSTER_BLUEPRINT } from "./monster";
import { RULES_BLUEPRINT } from "./rules";
import { SMALL_TREASURE_BLUEPRINT } from "./small-treasure";

export {
  HERO_BACK_BLUEPRINT,
  HERO_BLUEPRINT,
  LABELLED_BACK_BLUEPRINT,
  LARGE_TREASURE_BLUEPRINT,
  LOGO_BACK_BLUEPRINT,
  MONSTER_BLUEPRINT,
  RULES_BLUEPRINT,
  SMALL_TREASURE_BLUEPRINT,
};

export const blueprintsByTemplateId: Partial<Record<TemplateId, Blueprint>> = {
  hero: HERO_BLUEPRINT,
  monster: MONSTER_BLUEPRINT,
  "small-treasure": SMALL_TREASURE_BLUEPRINT,
  "large-treasure": LARGE_TREASURE_BLUEPRINT,
  rules: RULES_BLUEPRINT,
  "hero-back": HERO_BACK_BLUEPRINT,
  "logo-back": LOGO_BACK_BLUEPRINT,
  "labelled-back": LABELLED_BACK_BLUEPRINT,
};

const FULLY_QUALIFIED_BLUEPRINT_ID_PATTERN = /^hq\.\d{4}\.[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;

export type BlueprintNodeReportEntry = {
  templateId: TemplateId;
  container: "layer" | "group" | "group-child";
  id: string;
  type: string;
};

export type BlueprintIdValidationIssue = {
  templateId: TemplateId;
  container: "layer" | "group" | "group-child";
  id: string;
  message: string;
};

type BlueprintMap = Partial<Record<TemplateId, Blueprint>>;

function collectGroupChildEntries(
  templateId: TemplateId,
  groupId: string,
  children: BlueprintLayer[],
): BlueprintNodeReportEntry[] {
  return children.map((child) => ({
    templateId,
    container: "group-child",
    id: child.id,
    type: `${child.type}@${groupId}`,
  }));
}

export function getBlueprintNodeReport(): BlueprintNodeReportEntry[] {
  return Object.entries(blueprintsByTemplateId).flatMap(([templateId, blueprint]) => {
    if (!blueprint) return [];
    const typedTemplateId = templateId as TemplateId;
    const layerEntries: BlueprintNodeReportEntry[] = blueprint.layers.map((layer) => ({
      templateId: typedTemplateId,
      container: "layer",
      id: layer.id,
      type: layer.type,
    }));
    const groupEntries =
      blueprint.groups?.flatMap((group) => [
        {
          templateId: typedTemplateId,
          container: "group" as const,
          id: group.id,
          type: group.type,
        },
        ...collectGroupChildEntries(typedTemplateId, group.id, group.children),
      ]) ?? [];
    return [...layerEntries, ...groupEntries];
  });
}

export function validateBlueprintNodeIdsForSource(
  source: BlueprintMap,
): BlueprintIdValidationIssue[] {
  const issues: BlueprintIdValidationIssue[] = [];

  Object.entries(source).forEach(([templateId, blueprint]) => {
    if (!blueprint) return;
    const typedTemplateId = templateId as TemplateId;
    const scopedIds = new Set<string>();
    const recordIssue = (
      container: "layer" | "group" | "group-child",
      id: string,
      message: string,
    ) => {
      issues.push({ templateId: typedTemplateId, container, id, message });
    };
    const checkId = (container: "layer" | "group" | "group-child", id: string) => {
      if (!id.trim()) {
        recordIssue(container, id, "Blueprint node id must be non-empty");
        return;
      }
      if (!FULLY_QUALIFIED_BLUEPRINT_ID_PATTERN.test(id)) {
        recordIssue(container, id, "Blueprint node id must be fully qualified");
      }
      if (scopedIds.has(id)) {
        recordIssue(container, id, "Blueprint node id must be unique within a blueprint");
      } else {
        scopedIds.add(id);
      }
    };

    blueprint.layers.forEach((layer) => {
      checkId("layer", layer.id);
    });

    blueprint.groups?.forEach((group) => {
      checkId("group", group.id);
      group.children.forEach((child) => {
        checkId("group-child", child.id);
      });
    });
  });

  return issues;
}

export function validateBlueprintNodeIds(): BlueprintIdValidationIssue[] {
  return validateBlueprintNodeIdsForSource(blueprintsByTemplateId);
}

export function getCopyrightBounds(templateId: TemplateId): BlueprintBounds {
  const blueprint = blueprintsByTemplateId[templateId];
  const layer = blueprint?.layers.find((entry) => entry.type === "copyright");
  if (layer?.bounds) {
    return layer.bounds;
  }

  return { x: 0, y: 0, width: 0, height: 0 };
}
