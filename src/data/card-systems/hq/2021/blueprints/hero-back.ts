import heroBackBorderAndText from "@/assets/card-backgrounds/hero-back-border-and-text.png";
import { DEFAULT_COPYRIGHT_COLOR } from "@/config/colors";
import { blueprintIds, layerTypes, systemFamilies } from "@/data/card-systems/types";
import type { Blueprint } from "@/types/blueprints";

import {
  CARD_HEIGHT,
  CARD_WIDTH,
  COPYRIGHT_BOUNDS,
  COPYRIGHT_FONT_SIZE,
  COPYRIGHT_LINE_HEIGHT,
  DESCRIPTION_FONT_SIZE,
  DESCRIPTION_LETTER_SPACING,
  DESCRIPTION_LINE_HEIGHT,
  scaleBounds,
} from "./shared";

export const HERO_BACK_BLUEPRINT: Blueprint = {
  schemaVersion: 1,
  systemFamily: systemFamilies.hq_2021,
  templateId: "hero-back",
  canvas: { width: CARD_WIDTH, height: CARD_HEIGHT },
  layers: [
    {
      id: blueprintIds.hq_2021_background_base,
      type: layerTypes.background,
      source: "template",
      tintKey: "backgroundTint",
    },
    {
      id: blueprintIds.hq_2021_overlay_border,
      type: layerTypes.overlay,
      asset: heroBackBorderAndText,
      bounds: scaleBounds({ x: 0, y: 0, width: 750, height: 1050 }),
    },
    {
      id: blueprintIds.hq_2021_text_body,
      type: layerTypes.text,
      bounds: scaleBounds({ x: 85, y: 289, width: 580, height: 673 }),
      bind: { textKey: "description" },
      props: {
        fontSize: DESCRIPTION_FONT_SIZE,
        lineHeight: DESCRIPTION_LINE_HEIGHT,
        letterSpacingEm: DESCRIPTION_LETTER_SPACING,
        fontWeight: 550,
        align: "center",
        textLayoutMode: "fixed-bounds",
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
};
