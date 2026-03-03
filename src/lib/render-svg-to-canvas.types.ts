"use client";

export type RenderSvgToCanvasOptions = {
  svgElement: SVGSVGElement;
  width: number;
  height: number;
  existingCanvas?: HTMLCanvasElement | null;
  removeDebugBounds?: boolean;
  loggingId?: string;
  assetBlobsById?: Map<string, Blob>;
  mutateSvg?: (svg: SVGSVGElement) => void;
};
