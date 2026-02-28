import {
  computeRelativeScaleBounds,
  LEGACY_ABSOLUTE_IMAGE_SCALE_MAX,
  LEGACY_ABSOLUTE_IMAGE_SCALE_MIN,
} from "@/lib/image-scale";

describe("computeRelativeScaleBounds", () => {
  it("maps legacy absolute limits to relative limits using contain scale", () => {
    const result = computeRelativeScaleBounds({ x: 0, y: 0, width: 100, height: 100 }, 1000, 1000);
    expect(result.containScale).toBeCloseTo(0.1);
    expect(result.min).toBeCloseTo(LEGACY_ABSOLUTE_IMAGE_SCALE_MIN / 0.1);
    expect(result.max).toBeCloseTo(LEGACY_ABSOLUTE_IMAGE_SCALE_MAX / 0.1);
  });

  it("falls back to legacy absolute limits when contain scale is invalid", () => {
    const result = computeRelativeScaleBounds({ x: 0, y: 0, width: 100, height: 100 }, 0, 1000);
    expect(result.containScale).toBe(1);
    expect(result.min).toBe(LEGACY_ABSOLUTE_IMAGE_SCALE_MIN);
    expect(result.max).toBe(LEGACY_ABSOLUTE_IMAGE_SCALE_MAX);
  });
});
