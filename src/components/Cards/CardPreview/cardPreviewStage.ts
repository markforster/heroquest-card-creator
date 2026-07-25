"use client";

import { CARD_HEIGHT, CARD_WIDTH, savg } from "@/config/card-canvas";

export const CARD_CLIP_INSET = savg(2);
export const CARD_CORNER_RADIUS = savg(28);
export const CARD_EDITOR_STAGE_MARGIN_X = savg(64);
export const CARD_EDITOR_STAGE_MARGIN_Y = savg(64);
export const CARD_EDITOR_STAGE_WIDTH = CARD_WIDTH + CARD_EDITOR_STAGE_MARGIN_X * 2;
export const CARD_EDITOR_STAGE_HEIGHT = CARD_HEIGHT + CARD_EDITOR_STAGE_MARGIN_Y * 2;
export const CARD_EDITOR_STAGE_SCALE_X = CARD_EDITOR_STAGE_WIDTH / CARD_WIDTH;
export const CARD_EDITOR_STAGE_SCALE_Y = CARD_EDITOR_STAGE_HEIGHT / CARD_HEIGHT;

export type CardPreviewStageLayout = {
  stageWidth: number;
  stageHeight: number;
  cardOriginX: number;
  cardOriginY: number;
  svgWidthPercent: number;
  svgHeightPercent: number;
};

export function getCardPreviewStageLayout(): CardPreviewStageLayout {
  return {
    stageWidth: CARD_EDITOR_STAGE_WIDTH,
    stageHeight: CARD_EDITOR_STAGE_HEIGHT,
    cardOriginX: (CARD_EDITOR_STAGE_WIDTH - CARD_WIDTH) / 2,
    cardOriginY: (CARD_EDITOR_STAGE_HEIGHT - CARD_HEIGHT) / 2,
    svgWidthPercent: CARD_EDITOR_STAGE_SCALE_X * 100,
    svgHeightPercent: CARD_EDITOR_STAGE_SCALE_Y * 100,
  };
}

export { CARD_WIDTH, CARD_HEIGHT };
