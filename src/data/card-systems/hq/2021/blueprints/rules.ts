import { blueprintIds, layerTypes, systemFamilies } from "@/data/card-systems/types";
import type { Blueprint } from "@/types/blueprints";

import {
  CARD_HEIGHT,
  CARD_WIDTH,
  DESCRIPTION_FONT_SIZE,
  DESCRIPTION_LETTER_SPACING,
  DESCRIPTION_LINE_HEIGHT,
  scaleBounds,
} from "./shared";

export const RULES_BLUEPRINT: Blueprint = {
  schemaVersion: 1,
  systemFamily: systemFamilies.hq_2021,
  templateId: "rules",
  canvas: { width: CARD_WIDTH, height: CARD_HEIGHT },
  layers: [
    {
      id: blueprintIds.hq_2021_background_base,
      type: layerTypes.background,
      source: "template",
    },
    {
      id: blueprintIds.hq_2021_text_body,
      type: layerTypes.text,
      bounds: scaleBounds({ x: 45, y: 55, width: 660, height: 955 }),
      bind: { textKey: "description" },
      props: {
        fontSize: DESCRIPTION_FONT_SIZE,
        lineHeight: DESCRIPTION_LINE_HEIGHT,
        letterSpacingEm: DESCRIPTION_LETTER_SPACING,
        align: "left",
        textLayoutMode: "fixed-bounds",
      },
    },
  ],
};
