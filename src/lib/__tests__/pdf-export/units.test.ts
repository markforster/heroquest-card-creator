import { mmToPt, ptToMm } from "@/lib/pdf-export/units";

describe("pdf-export units", () => {
  it("converts mm to pt", () => {
    expect(mmToPt(25.4)).toBeCloseTo(72, 6);
  });

  it("converts pt to mm", () => {
    expect(ptToMm(72)).toBeCloseTo(25.4, 6);
  });
});
