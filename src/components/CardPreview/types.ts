"use client";

import type { StaticImageData } from "next/image";

import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

export type CardPreviewProps = {
  templateId?: TemplateId;
  templateName?: string;
  backgroundSrc?: StaticImageData;
  cardData?: CardDataByTemplate[TemplateId];
};

export type CardPreviewHandle = {
  exportAsPng: () => Promise<void>;
  renderToPngBlob: (options?: { width?: number; height?: number }) => Promise<Blob | null>;
  renderToCanvas: (options?: {
    width?: number;
    height?: number;
    removeDebugBounds?: boolean;
  }) => Promise<HTMLCanvasElement | null>;
  getSvgElement: () => SVGSVGElement | null;
};
