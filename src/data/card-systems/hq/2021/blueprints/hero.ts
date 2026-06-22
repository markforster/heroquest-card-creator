import { DEFAULT_COPYRIGHT_COLOR } from "@/config/colors";
import { EMPHASIZED_LABEL_WEIGHT } from "@/config/typography";
import { blueprintIds, groupTypes, layerTypes, systemFamilies } from "@/data/card-systems/types";
import type { Blueprint } from "@/types/blueprints";

import {
  CARD_HEIGHT,
  CARD_WIDTH,
  COPYRIGHT_BOUNDS,
  COPYRIGHT_FONT_SIZE,
  COPYRIGHT_LINE_HEIGHT,
  HERO_MONSTER_BODY_FONT_SIZE,
  HERO_MONSTER_BODY_LETTER_SPACING,
  HERO_MONSTER_BODY_LINE_HEIGHT,
  HERO_MONSTER_STACK_ORIGIN_Y,
  makeRibbonBounds,
  makeRibbonTextBounds,
  scaleBounds,
  sx,
  sy,
} from "./shared";

export const HERO_BLUEPRINT: Blueprint = {
  schemaVersion: 1,
  systemFamily: systemFamilies.hq_2021,
  templateId: "hero",
  canvas: { width: CARD_WIDTH, height: CARD_HEIGHT },
  layers: [
    {
      id: blueprintIds.hq_2021_background_base,
      type: layerTypes.background,
      source: "template",
      tintKey: "backgroundTint",
    },
    {
      id: blueprintIds.hq_2021_image_main,
      type: layerTypes.image,
      bounds: scaleBounds({ x: 0, y: 120, width: 750, height: 730 }),
      bind: { imageKey: "imageAssetId" },
      when: { hasImage: "imageAssetId" },
      clip: "canvas",
    },
    {
      id: blueprintIds.hq_2021_title_main,
      type: layerTypes.title,
      bind: { titleKey: "title" },
      props: {
        ribbonX: makeRibbonBounds({ y: 46 }).x,
        ribbonY: makeRibbonBounds({ y: 46 }).y,
        ribbonWidth: makeRibbonBounds().width,
        ribbonHeight: makeRibbonBounds().height,
        textX: makeRibbonTextBounds({ y: 66 }).x,
        textY: makeRibbonTextBounds({ y: 66 }).y,
        textWidth: makeRibbonTextBounds().width,
        textHeight: makeRibbonTextBounds().height,
      },
    },
    {
      id: blueprintIds.hq_2021_text_copyright,
      type: layerTypes.copyright,
      bounds: COPYRIGHT_BOUNDS,
      bind: { textKey: "copyright" },
      props: {
        fontSize: COPYRIGHT_FONT_SIZE,
        lineHeight: COPYRIGHT_LINE_HEIGHT,
        fontWeight: 500,
        align: "center",
        fill: DEFAULT_COPYRIGHT_COLOR,
        letterSpacingEm: -0.01,
        fontFamily: "Helvetica, Arial, sans-serif",
      },
    },
  ],
  groups: [
    {
      id: blueprintIds.hq_2021_group_hero_bottom_stack,
      type: groupTypes.stack,
      anchor: "bottom",
      direction: "up",
      origin: { x: sx(54), y: HERO_MONSTER_STACK_ORIGIN_Y },
      width: sx(636),
      gap: sy(2),
      children: [
        {
          id: blueprintIds.hq_2021_text_body,
          type: layerTypes.text,
          bind: { textKey: "description" },
          props: {
            fontSize: HERO_MONSTER_BODY_FONT_SIZE,
            lineHeight: HERO_MONSTER_BODY_LINE_HEIGHT,
            letterSpacingEm: HERO_MONSTER_BODY_LETTER_SPACING,
            fontWeight: EMPHASIZED_LABEL_WEIGHT,
            textLayoutMode: "auto-height",
          },
        },
        {
          id: blueprintIds.hq_2021_stats_hero_primary,
          type: layerTypes.stats_hero,
          props: { height: sy(170) },
        },
      ],
    },
  ],
};
