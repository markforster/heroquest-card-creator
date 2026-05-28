import { PDFPage } from "pdf-lib";

import { renderPdf } from "@/lib/pdf-export/render-pdf";

import type { PrintConfig } from "@/lib/pdf-export/types";

jest.mock("@/generated/embeddedAssets", () => ({
  embeddedImagesByFileName: {
    "thqcc-qr.jpg":
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+y6gAAAABJRU5ErkJggg==",
  },
}));

const ONE_BY_ONE_PNG_BYTES = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+y6gAAAABJRU5ErkJggg==",
    "base64",
  ),
);

describe("pdf-export renderPdf", () => {
  const config: PrintConfig = {
    paper: "A4",
    orientation: "portrait",
    marginsMm: { top: 10, right: 10, bottom: 10, left: 10 },
    gapMm: { x: 1, y: 1 },
    cardMm: { width: 63.5, height: 88.9 },
    mode: "frontsOnly",
    bleedMode: "bakedInImage",
    bleedMm: 3,
  };

  it("reports progress and finalizing phase", async () => {
    const drawTextSpy = jest.spyOn(PDFPage.prototype, "drawText");
    const phases: string[] = [];
    const progressCalls: Array<{ completedFaces: number; totalFaces: number }> = [];

    const result = await renderPdf({
      config,
      layout: {
        paperMm: { width: 210, height: 297 },
        grid: { cols: 1, rows: 2, perPage: 2 },
        placements: [
          {
            slotIndex: 0,
            innerRectMm: { xMm: 13, yMm: 13, wMm: 63.5, hMm: 88.9 },
            outerRectMm: { xMm: 10, yMm: 10, wMm: 69.5, hMm: 94.9 },
          },
          {
            slotIndex: 1,
            innerRectMm: { xMm: 13, yMm: 110.9, wMm: 63.5, hMm: 88.9 },
            outerRectMm: { xMm: 10, yMm: 107.9, wMm: 69.5, hMm: 94.9 },
          },
        ],
      },
      composition: {
        totalSlots: 2,
        sheets: [
          {
            sheetIndex: 0,
            slots: [
              { slotId: "s1", frontId: "f1", backId: null },
              { slotId: "s2", frontId: "f2", backId: null },
            ],
          },
        ],
      },
      fileName: "test.pdf",
      renderFacePngBytes: async () => ONE_BY_ONE_PNG_BYTES,
      onPhase: (phase) => phases.push(phase),
      onProgress: (progress) => progressCalls.push(progress),
    });

    expect(result.status).toBe("success");
    expect(phases).toContain("rendering");
    expect(phases).toContain("finalizing");
    expect(progressCalls).toHaveLength(2);
    expect(progressCalls[1]).toMatchObject({ completedFaces: 2, totalFaces: 2 });
    expect(drawTextSpy).toHaveBeenCalledTimes(3);
    drawTextSpy.mockRestore();
  });

  it("draws attribution footer on both pages in front+back mode", async () => {
    const drawTextSpy = jest.spyOn(PDFPage.prototype, "drawText");
    const result = await renderPdf({
      config: { ...config, mode: "frontAndBack", duplexPreset: "mirrorX" },
      layout: {
        paperMm: { width: 210, height: 297 },
        grid: { cols: 1, rows: 1, perPage: 1 },
        placements: [
          {
            slotIndex: 0,
            innerRectMm: { xMm: 13, yMm: 13, wMm: 63.5, hMm: 88.9 },
            outerRectMm: { xMm: 10, yMm: 10, wMm: 69.5, hMm: 94.9 },
          },
        ],
      },
      composition: {
        totalSlots: 1,
        sheets: [{ sheetIndex: 0, slots: [{ slotId: "s1", frontId: "f1", backId: "b1" }] }],
      },
      fileName: "test.pdf",
      renderFacePngBytes: async () => ONE_BY_ONE_PNG_BYTES,
    });

    expect(result.status).toBe("success");
    expect(result.pageCount).toBe(2);
    expect(drawTextSpy).toHaveBeenCalledTimes(6);
    drawTextSpy.mockRestore();
  });

  it("returns cancelled when cancellation requested", async () => {
    const result = await renderPdf({
      config,
      layout: {
        paperMm: { width: 210, height: 297 },
        grid: { cols: 1, rows: 1, perPage: 1 },
        placements: [
          {
            slotIndex: 0,
            innerRectMm: { xMm: 13, yMm: 13, wMm: 63.5, hMm: 88.9 },
            outerRectMm: { xMm: 10, yMm: 10, wMm: 69.5, hMm: 94.9 },
          },
        ],
      },
      composition: {
        totalSlots: 1,
        sheets: [{ sheetIndex: 0, slots: [{ slotId: "s1", frontId: "f1", backId: null }] }],
      },
      fileName: "test.pdf",
      renderFacePngBytes: async () => ONE_BY_ONE_PNG_BYTES,
      shouldCancel: () => true,
    });

    expect(result.status).toBe("cancelled");
  });

  it("supports layoutBleed mode and adds optional calibration page", async () => {
    const result = await renderPdf({
      config: { ...config, bleedMode: "layoutBleed", mode: "frontsOnly" },
      layout: {
        paperMm: { width: 210, height: 297 },
        grid: { cols: 1, rows: 1, perPage: 1 },
        placements: [
          {
            slotIndex: 0,
            innerRectMm: { xMm: 13, yMm: 13, wMm: 63.5, hMm: 88.9 },
            outerRectMm: { xMm: 10, yMm: 10, wMm: 69.5, hMm: 94.9 },
          },
        ],
      },
      composition: {
        totalSlots: 1,
        sheets: [{ sheetIndex: 0, slots: [{ slotId: "s1", frontId: "f1", backId: null }] }],
      },
      fileName: "test.pdf",
      renderFacePngBytes: async () => ONE_BY_ONE_PNG_BYTES,
      includeCalibrationPage: true,
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.pageCount).toBe(2);
    }
  });
});
