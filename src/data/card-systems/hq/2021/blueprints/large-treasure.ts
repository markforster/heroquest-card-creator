import largeWindowFrame from "@/assets/card-backgrounds/large-window-frame.png";
import smallLargeArtworkBorderMask from "@/assets/card-backgrounds/small-large-artwork-border-alpha-mask.png";
import smallLargeArtworkBorderTexture from "@/assets/card-backgrounds/small-large-artwork-border-blend-texture.png";
import whitePaperBackground from "@/assets/card-backgrounds/white-paper.png";
import { DEFAULT_COPYRIGHT_COLOR } from "@/config/colors";
import { blueprintIds, layerTypes, systemFamilies } from "@/data/card-systems/types";
import type { Blueprint } from "@/types/blueprints";

import {
  CARD_HEIGHT,
  CARD_WIDTH,
  COPYRIGHT_BOUNDS_ARTWORK,
  COPYRIGHT_FONT_SIZE,
  COPYRIGHT_LINE_HEIGHT,
  DESCRIPTION_FONT_SIZE,
  DESCRIPTION_LETTER_SPACING,
  DESCRIPTION_LINE_HEIGHT,
  expandBounds,
  makeRibbonBounds,
  makeRibbonTextBounds,
  makeRibbonTextNoRibbonBounds,
  makeTreasureDescBounds,
  scaleBounds,
  sx,
  sy,
} from "./shared";

export const LARGE_TREASURE_BLUEPRINT: Blueprint = {
  schemaVersion: 1,
  systemFamily: systemFamilies.hq_2021,
  templateId: "large-treasure",
  canvas: { width: CARD_WIDTH, height: CARD_HEIGHT },
  layers: [
    {
      id: blueprintIds.hq_2021_background_base,
      type: layerTypes.background,
      source: "asset",
      asset: whitePaperBackground,
      tintKey: "backgroundTint",
    },
    {
      id: blueprintIds.hq_2021_background_frame,
      type: layerTypes.background,
      source: "template",
      cutoutBounds: scaleBounds({ x: 123, y: 167, width: 509, height: 359 }),
      tintKey: "backgroundTint",
    },
    {
      id: blueprintIds.hq_2021_image_main,
      type: layerTypes.image,
      bounds: scaleBounds({ x: 123, y: 167, width: 509, height: 359 }),
      bind: { imageKey: "imageAssetId" },
      when: { hasImage: "imageAssetId" },
      clip: "bounds",
      props: { offsetX: sx(0), offsetY: sy(0) },
    },
    {
      id: blueprintIds.hq_2021_overlay_artwork_frame,
      type: layerTypes.overlay,
      asset: largeWindowFrame,
      bounds: expandBounds(scaleBounds({ x: 123, y: 167, width: 509, height: 359 }), {
        x: sx(8),
        y: sy(8),
      }),
      props: { preserveAspectRatio: "none" },
    },
    {
      id: blueprintIds.hq_2021_border_texture,
      type: layerTypes.border,
      mask: smallLargeArtworkBorderMask,
      texture: smallLargeArtworkBorderTexture,
      blendMode: "multiply",
      offsetX: sx(1),
      offsetY: sy(-1),
    },
    {
      id: blueprintIds.hq_2021_text_body,
      type: layerTypes.text,
      bounds: makeTreasureDescBounds(555),
      bind: { textKey: "description" },
      props: {
        fontSize: DESCRIPTION_FONT_SIZE,
        lineHeight: DESCRIPTION_LINE_HEIGHT,
        letterSpacingEm: DESCRIPTION_LETTER_SPACING,
        textLayoutMode: "fixed-bounds",
      },
    },
    {
      id: blueprintIds.hq_2021_title_main,
      type: layerTypes.title,
      bind: { titleKey: "title" },
      props: {
        showRibbon: false,
        ribbonX: makeRibbonBounds({ y: 46 }).x,
        ribbonY: makeRibbonBounds({ y: 46 }).y,
        ribbonWidth: makeRibbonBounds().width,
        ribbonHeight: makeRibbonBounds().height,
        textX: makeRibbonTextBounds({ y: 46 }).x,
        textY: makeRibbonTextBounds({ y: 46 }).y,
        textWidth: makeRibbonTextBounds().width,
        textHeight: makeRibbonTextBounds().height,
        textNoRibbonX: makeRibbonTextNoRibbonBounds({ y: 82 }).x,
        textNoRibbonY: makeRibbonTextNoRibbonBounds({ y: 82 }).y,
        textNoRibbonWidth: makeRibbonTextNoRibbonBounds().width,
        textNoRibbonHeight: makeRibbonTextNoRibbonBounds().height,
      },
    },
    {
      id: blueprintIds.hq_2021_text_copyright,
      type: layerTypes.copyright,
      bounds: COPYRIGHT_BOUNDS_ARTWORK,
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
};
