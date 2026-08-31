import {
  getPdfFooterReserveMm,
  getPdfFooterReservePt,
  PDF_ATTRIBUTION_MARGIN_MM,
  PDF_ATTRIBUTION_QR_SIZE_MM,
} from "@/lib/pdf-export/footer";
import { mmToPt } from "@/lib/pdf-export/units";

describe("PDF footer reserve", () => {
  it("reserves the QR size plus vertical margins in millimetres and points", () => {
    const expectedMm = PDF_ATTRIBUTION_QR_SIZE_MM + PDF_ATTRIBUTION_MARGIN_MM * 2;
    expect(getPdfFooterReserveMm()).toBe(expectedMm);
    expect(getPdfFooterReservePt()).toBe(mmToPt(expectedMm));
  });
});
