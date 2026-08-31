import { DEFAULT_COPYRIGHT_COLOR } from "@/config/colors";
import { blueprintIds, groupTypes, layerTypes, systemFamilies } from "@/data/card-systems/types";
import type { Blueprint } from "@/types/blueprints";
import { IMAGE_CLIP_EDGE_BOTTOM } from "@/types/image-clip-edges";

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
  savg,
  scaleBounds,
  sx,
  sy,
} from "./shared";

const MONSTER_MAIN_IMAGE_BOUNDS = scaleBounds({ x: 0, y: 120, width: 750, height: 730 });
const MONSTER_MAIN_IMAGE_CLIP_MIN_BOTTOM = sy(470);
const MONSTER_MAIN_IMAGE_CLIP_DEFAULT_BOTTOM =
  MONSTER_MAIN_IMAGE_BOUNDS.y + MONSTER_MAIN_IMAGE_BOUNDS.height;

export const MONSTER_BLUEPRINT: Blueprint = {
  schemaVersion: 1,
  systemFamily: systemFamilies.hq_2021,
  templateId: "monster",
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
      bounds: MONSTER_MAIN_IMAGE_BOUNDS,
      bind: { imageKey: "imageAssetId" },
      when: { hasImage: "imageAssetId" },
      clip: "canvas",
      adjustableClipEdgeMask: IMAGE_CLIP_EDGE_BOTTOM,
      adjustableClipBottomMin: MONSTER_MAIN_IMAGE_CLIP_MIN_BOTTOM,
      adjustableClipBottomDefault: MONSTER_MAIN_IMAGE_CLIP_DEFAULT_BOTTOM,
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
        defaultVisible: true,
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
      id: blueprintIds.hq_2021_group_monster_bottom_stack,
      type: groupTypes.stack,
      anchor: "bottom",
      direction: "up",
      origin: { x: sx(48), y: HERO_MONSTER_STACK_ORIGIN_Y },
      width: sx(652),
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
            textLayoutMode: "auto-height",
          },
        },
        {
          id: blueprintIds.hq_2021_stats_monster_primary,
          type: layerTypes.stats_monster,
          props: { height: sy(179) },
        },
        {
          id: blueprintIds.hq_2021_icon_monster_primary,
          type: layerTypes.icon,
          bind: { iconKey: "iconAssetId" },
          when: { hasImage: "iconAssetId" },
          props: { size: savg(126), offsetX: sx(-4), offsetY: sy(-10) },
        },
      ],
    },
  ],
};
