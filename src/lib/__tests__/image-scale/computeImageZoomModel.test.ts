import {
  computeSliderTickLeftPx,
  computeImageZoomModel,
  mapRelativeScaleToUiZoom,
  mapUiZoomToRelativeScale,
} from "@/lib/image-scale";

describe("computeImageZoomModel", () => {
  it("maps ui zoom values to literal relative multipliers", () => {
    const model = computeImageZoomModel({ x: 0, y: 0, width: 500, height: 180 }, 1050, 750);
    const relativeAt2x = mapUiZoomToRelativeScale(2, model);
    const relativeAt3x = mapUiZoomToRelativeScale(3, model);
    expect(relativeAt2x).toBeCloseTo(2, 6);
    expect(relativeAt3x).toBeCloseTo(3, 6);
  });

  it("keeps 0.5x and 1x anchors predictable", () => {
    const model = computeImageZoomModel({ x: 0, y: 0, width: 730, height: 730 }, 1050, 750);
    expect(mapUiZoomToRelativeScale(0.5, model)).toBeCloseTo(0.5, 6);
    expect(mapUiZoomToRelativeScale(1, model)).toBeCloseTo(1, 6);
  });

  it("round-trips ui fit baseline through relative mapping", () => {
    const model = computeImageZoomModel({ x: 0, y: 0, width: 730, height: 730 }, 2000, 1200);
    const relative = mapUiZoomToRelativeScale(1, model);
    expect(relative).toBeCloseTo(1, 6);
    expect(mapRelativeScaleToUiZoom(relative, model)).toBeCloseTo(1, 6);
  });

  it("round-trips ui anchors through inverse mapping", () => {
    const model = computeImageZoomModel({ x: 0, y: 0, width: 730, height: 730 }, 1050, 750);
    const relativeAt2x = mapUiZoomToRelativeScale(2, model);
    const relativeAt3x = mapUiZoomToRelativeScale(3, model);
    expect(mapRelativeScaleToUiZoom(relativeAt2x, model)).toBeCloseTo(2, 6);
    expect(mapRelativeScaleToUiZoom(relativeAt3x, model)).toBeCloseTo(3, 6);
  });

  it("keeps ui max high enough to reach cover and legacy headroom", () => {
    const model = computeImageZoomModel({ x: 0, y: 0, width: 500, height: 180 }, 1050, 750);
    expect(model.uiMax).toBeGreaterThanOrEqual(model.relativeCover);
    expect(model.uiMax).toBeGreaterThanOrEqual(4);
    expect(model.relativeMax).toBeGreaterThanOrEqual(model.uiMax);
  });

  it("computes pixel-aligned tick positions using thumb-travel math", () => {
    const leftAtMin = computeSliderTickLeftPx(0.5, 0.5, 4, 200, 12);
    const leftAtOne = computeSliderTickLeftPx(1, 0.5, 4, 200, 12);
    const leftAtMax = computeSliderTickLeftPx(4, 0.5, 4, 200, 12);
    expect(leftAtMin).toBeCloseTo(6, 6);
    expect(leftAtOne).toBeCloseTo(32.857142, 4);
    expect(leftAtMax).toBeCloseTo(194, 6);
  });
});
