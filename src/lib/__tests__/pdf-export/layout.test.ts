import { computeLayoutPlan } from "@/lib/pdf-export/layout";
import { getPdfFooterReserveMm } from "@/lib/pdf-export/footer";

import type { PrintConfig } from "@/lib/pdf-export/types";

describe("pdf-export layout", () => {
  const config: PrintConfig = {
    paper: "A4",
    orientation: "portrait",
    marginsMm: { top: 10, right: 10, bottom: 10, left: 10 },
    gapMm: { x: 2, y: 2 },
    cardMm: { width: 63.5, height: 88.9 },
    mode: "frontsOnly",
    bleedMode: "bakedInImage",
    bleedMm: 3,
  };

  it("computes deterministic row-major layout", () => {
    const plan = computeLayoutPlan(config);
    expect(plan.grid.cols).toBeGreaterThan(0);
    expect(plan.grid.rows).toBeGreaterThan(0);
    expect(plan.grid.perPage).toBe(plan.placements.length);
    expect(plan.placements[0].innerRectMm.wMm).toBeCloseTo(63.5);
    expect(plan.placements[0].innerRectMm.hMm).toBeCloseTo(88.9);
    expect(plan.placements[0].outerRectMm.wMm).toBeCloseTo(69.5);
    expect(plan.placements[0].outerRectMm.hMm).toBeCloseTo(94.9);
    expect(plan.placements[0].imageRectMm).toEqual(plan.placements[0].outerRectMm);
    if (plan.placements.length >= 2) {
      expect(plan.placements[1].innerRectMm.xMm).toBeGreaterThan(plan.placements[0].innerRectMm.xMm);
      expect(plan.placements[1].innerRectMm.yMm).toBe(plan.placements[0].innerRectMm.yMm);
    }
  });

  it("fits 4x2 trim slots on A4 landscape with default poker sizing", () => {
    const plan = computeLayoutPlan({
      ...config,
      orientation: "landscape",
      marginsMm: { top: 0, right: 0, bottom: 0, left: 0 },
      gapMm: { x: 0, y: 0 },
      cardMm: { width: 63.5, height: 88.9 },
      bleedMm: 3,
    }, { reservedBottomMm: getPdfFooterReserveMm() });

    expect(plan.grid.cols).toBe(4);
    expect(plan.grid.rows).toBe(2);
    expect(plan.grid.perPage).toBe(8);
  });

  it("separates rendered image bounds from bleed bounds when mark padding exceeds bleed", () => {
    const plan = computeLayoutPlan(config, { imagePaddingMm: 4 });

    expect(plan.placements[0].imageRectMm.wMm).toBeCloseTo(71.5);
    expect(plan.placements[0].imageRectMm.hMm).toBeCloseTo(96.9);
    expect(plan.placements[0].outerRectMm.wMm).toBeCloseTo(69.5);
    expect(plan.placements[0].outerRectMm.hMm).toBeCloseTo(94.9);
    expect(plan.placements[0].outerRectMm.xMm - plan.placements[0].imageRectMm.xMm).toBeCloseTo(1);
    expect(plan.placements[0].innerRectMm.xMm - plan.placements[0].imageRectMm.xMm).toBeCloseTo(4);
  });
});
