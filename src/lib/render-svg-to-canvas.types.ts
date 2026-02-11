"use client";

export type RenderSvgToCanvasOptions = {
  svgElement: SVGSVGElement;
  width: number;
  height: number;
  existingCanvas?: HTMLCanvasElement | null;
};
