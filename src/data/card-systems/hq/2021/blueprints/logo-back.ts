import heroBackJustBorder from "@/assets/card-backgrounds/hero-back-just-border.png";
import heroBackJustLogo from "@/assets/card-backgrounds/hero-back-just-logo.png";
import { DEFAULT_COPYRIGHT_COLOR } from "@/config/colors";
import { blueprintIds, layerTypes, systemFamilies } from "@/data/card-systems/types";
import type { Blueprint } from "@/types/blueprints";

import {
  CARD_HEIGHT,
  CARD_WIDTH,
  COPYRIGHT_BOUNDS_ROTATED_RIGHT,
  COPYRIGHT_FONT_SIZE,
  COPYRIGHT_LINE_HEIGHT,
  scaleBounds,
} from "./shared";

export const LOGO_BACK_BLUEPRINT: Blueprint = {
  schemaVersion: 1,
  systemFamily: systemFamilies.hq_2021,
  templateId: "logo-back",
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
      asset: heroBackJustBorder,
      bounds: scaleBounds({ x: 0, y: 0, width: 750, height: 1050 }),
    },
    {
      id: blueprintIds.hq_2021_logo_hero_back,
      type: layerTypes.logo,
      asset: heroBackJustLogo,
      bounds: scaleBounds({ x: 218, y: 70, width: 322, height: 898 }),
      bind: { logoKey: "heroBackLogoId" },
      rotation: -90,
    },
    {
      id: blueprintIds.hq_2021_text_copyright,
      type: layerTypes.copyright,
      bounds: COPYRIGHT_BOUNDS_ROTATED_RIGHT,
      bind: { textKey: "copyright" },
      props: {
        defaultVisible: true,
        rotation: -90,
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
