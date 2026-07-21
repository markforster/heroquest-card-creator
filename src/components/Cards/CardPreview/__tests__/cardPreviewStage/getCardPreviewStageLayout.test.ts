import {
  CARD_EDITOR_STAGE_HEIGHT,
  CARD_EDITOR_STAGE_MARGIN_X,
  CARD_EDITOR_STAGE_MARGIN_Y,
  CARD_EDITOR_STAGE_SCALE_X,
  CARD_EDITOR_STAGE_SCALE_Y,
  CARD_EDITOR_STAGE_WIDTH,
  CARD_HEIGHT,
  CARD_WIDTH,
  getCardPreviewStageLayout,
} from "@/components/Cards/CardPreview/cardPreviewStage";

describe("getCardPreviewStageLayout", () => {
  it("centers the card within the editor stage", () => {
    expect(getCardPreviewStageLayout()).toEqual({
      stageWidth: CARD_EDITOR_STAGE_WIDTH,
      stageHeight: CARD_EDITOR_STAGE_HEIGHT,
      cardOriginX: CARD_EDITOR_STAGE_MARGIN_X,
      cardOriginY: CARD_EDITOR_STAGE_MARGIN_Y,
      svgWidthPercent: CARD_EDITOR_STAGE_SCALE_X * 100,
      svgHeightPercent: CARD_EDITOR_STAGE_SCALE_Y * 100,
    });
  });

  it("derives the stage dimensions from card size and margins", () => {
    expect(CARD_EDITOR_STAGE_WIDTH).toBe(CARD_WIDTH + CARD_EDITOR_STAGE_MARGIN_X * 2);
    expect(CARD_EDITOR_STAGE_HEIGHT).toBe(CARD_HEIGHT + CARD_EDITOR_STAGE_MARGIN_Y * 2);
  });
});
