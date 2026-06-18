import { CARD_HEIGHT, CARD_WIDTH, savg, sx, sy } from "@/config/card-canvas";
import type { BlueprintBounds } from "@/types/blueprints";

export const DESCRIPTION_FONT_SIZE = savg(32);
export const DESCRIPTION_LINE_HEIGHT = DESCRIPTION_FONT_SIZE * 1.25;
export const DESCRIPTION_LETTER_SPACING = 0.000015;
export const HERO_MONSTER_BODY_FONT_SIZE = savg(26);
export const HERO_MONSTER_BODY_LINE_HEIGHT = HERO_MONSTER_BODY_FONT_SIZE * 1.05;
export const HERO_MONSTER_BODY_LETTER_SPACING = 0.000015;
export const COPYRIGHT_FONT_SIZE = savg(20);
export const COPYRIGHT_LINE_HEIGHT = savg(20);
export const COPYRIGHT_HEIGHT = sy(22);
export const COPYRIGHT_BOTTOM_MARGIN = sy(24);
export const COPYRIGHT_STACK_GAP = sy(8);
export const COPYRIGHT_BOUNDS = {
  x: sx(60),
  y: CARD_HEIGHT - COPYRIGHT_BOTTOM_MARGIN - COPYRIGHT_HEIGHT,
  width: sx(630),
  height: COPYRIGHT_HEIGHT,
};
export const COPYRIGHT_BOUNDS_ARTWORK = {
  ...COPYRIGHT_BOUNDS,
  y: COPYRIGHT_BOUNDS.y - sy(56),
};
export const HERO_MONSTER_STACK_ORIGIN_Y = COPYRIGHT_BOUNDS.y - COPYRIGHT_STACK_GAP;
export const TREASURE_DESC_X = sx(120);
export const TREASURE_DESC_WIDTH = sx(515);
export const TREASURE_DESC_BOTTOM = sy(986);
export const RIBBON_BOUNDS = { x: 86, y: 46, width: 578, height: 145.15 };
export const RIBBON_TEXT_BOUNDS = { x: 171, y: 66, width: 428, height: 58.15 };
export const RIBBON_TEXT_BOUNDS_NO_RIBBON = { x: 81, y: 82, width: 588, height: 60.15 };

export const scaleBounds = (bounds: BlueprintBounds): BlueprintBounds => ({
  x: sx(bounds.x),
  y: sy(bounds.y),
  width: sx(bounds.width),
  height: sy(bounds.height),
});

export const makeRibbonBounds = (overrides?: Partial<typeof RIBBON_BOUNDS>) =>
  scaleBounds({
    ...RIBBON_BOUNDS,
    ...(overrides ?? {}),
  });

export const makeRibbonTextBounds = (overrides?: Partial<typeof RIBBON_TEXT_BOUNDS>) =>
  scaleBounds({
    ...RIBBON_TEXT_BOUNDS,
    ...(overrides ?? {}),
  });

export const makeRibbonTextNoRibbonBounds = (
  overrides?: Partial<typeof RIBBON_TEXT_BOUNDS_NO_RIBBON>,
) =>
  scaleBounds({
    ...RIBBON_TEXT_BOUNDS_NO_RIBBON,
    ...(overrides ?? {}),
  });

export const expandBounds = (bounds: BlueprintBounds, inset: { x: number; y: number }) => ({
  x: bounds.x - inset.x,
  y: bounds.y - inset.y,
  width: bounds.width + inset.x * 2,
  height: bounds.height + inset.y * 2,
});

export const makeTreasureDescBounds = (topY: number) => ({
  x: TREASURE_DESC_X,
  y: sy(topY),
  width: TREASURE_DESC_WIDTH,
  height: TREASURE_DESC_BOTTOM - sy(topY),
});

export { CARD_HEIGHT, CARD_WIDTH, savg, sx, sy };
