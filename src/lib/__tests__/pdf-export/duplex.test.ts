import { applyDuplexPreset } from "@/lib/pdf-export/duplex";

import type { MmRect } from "@/lib/pdf-export/types";

describe("pdf-export duplex", () => {
  const page = { width: 210, height: 297 };
  const placement: MmRect = {
    xMm: 10,
    yMm: 20,
    wMm: 30,
    hMm: 40,
  };

  it("keeps placement for normal preset", () => {
    expect(applyDuplexPreset(placement, page, "normal")).toEqual(placement);
  });

  it("mirrors horizontally for mirrorX", () => {
    const next = applyDuplexPreset(placement, page, "mirrorX");
    expect(next.xMm).toBeCloseTo(170);
    expect(next.yMm).toBe(20);
  });

  it("rotates for rotate180", () => {
    const next = applyDuplexPreset(placement, page, "rotate180");
    expect(next.xMm).toBeCloseTo(170);
    expect(next.yMm).toBeCloseTo(237);
  });
});
