import {
  isPdfJpegOptimizationEnabled,
  PDF_EXPORT_JPEG_QUALITY,
} from "@/lib/pdf-export/jpeg-optimization";

describe("PDF JPEG optimization configuration", () => {
  it.each([undefined, "", "false", "0", "no", "off", "unexpected"])(
    "enables optimization when the disable flag is %p",
    (value) => {
      expect(isPdfJpegOptimizationEnabled(value)).toBe(true);
    },
  );

  it.each(["true", "1", "yes", "on", " TRUE "])(
    "disables optimization when the disable flag is %p",
    (value) => {
      expect(isPdfJpegOptimizationEnabled(value)).toBe(false);
    },
  );

  it("uses the documented JPEG quality", () => {
    expect(PDF_EXPORT_JPEG_QUALITY).toBe(0.8);
  });
});
