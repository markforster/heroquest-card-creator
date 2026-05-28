import { computeLayoutPlan } from "@/lib/pdf-export/layout";

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
    if (plan.placements.length >= 2) {
      expect(plan.placements[1].innerRectMm.xMm).toBeGreaterThan(plan.placements[0].innerRectMm.xMm);
      expect(plan.placements[1].innerRectMm.yMm).toBe(plan.placements[0].innerRectMm.yMm);
    }
  });
});
