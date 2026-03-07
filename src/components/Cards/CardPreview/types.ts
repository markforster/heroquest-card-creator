"use client";

import type { StaticImageData } from "next/image";

import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

export type CardPreviewProps = {
  templateId?: TemplateId;
  templateName?: string;
  backgroundSrc?: StaticImageData;
  cardData?: CardDataByTemplate[TemplateId];
  copyrightTextColor?: string;
};

export type CardPreviewHandle = {
  exportAsPng: (options?: {
    bleedPx?: number;
    cropMarks?: { enabled: boolean; color: string; style?: "lines" | "squares" };
    cutMarks?: { enabled: boolean; color: string };
    roundedCorners?: boolean;
  }) => Promise<void>;
  waitForBackgroundLoaded?: (timeoutMs?: number) => Promise<void>;
  syncCopyrightContrast?: (options?: { width?: number; height?: number }) => Promise<void>;
  renderToPngBlob: (options?: {
    width?: number;
    height?: number;
    loggingId?: string;
    assetBlobsById?: Map<string, Blob>;
    bleedPx?: number;
    cropMarks?: { enabled: boolean; color: string; style?: "lines" | "squares" };
    cutMarks?: { enabled: boolean; color: string };
    roundedCorners?: boolean;
  }) => Promise<Blob | null>;
  renderToCanvas: (options?: {
    width?: number;
    height?: number;
    removeDebugBounds?: boolean;
  }) => Promise<HTMLCanvasElement | null>;
  getSvgElement: () => SVGSVGElement | null;
};
