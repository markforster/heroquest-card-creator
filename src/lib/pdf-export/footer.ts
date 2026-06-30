import { mmToPt } from "@/lib/pdf-export/units";

export const PDF_ATTRIBUTION_TEXT_SIZE_PT = 7;
export const PDF_ATTRIBUTION_MARGIN_MM = 2;
export const PDF_ATTRIBUTION_QR_SIZE_MM = 12;
export const PDF_ATTRIBUTION_TEXT_GAP_MM = 2;

export function getPdfFooterReserveMm(): number {
  return PDF_ATTRIBUTION_QR_SIZE_MM + PDF_ATTRIBUTION_MARGIN_MM * 2;
}

export function getPdfFooterReservePt(): number {
  return mmToPt(getPdfFooterReserveMm());
}
